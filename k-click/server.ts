import express from "express";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

function cleanEnvValue(raw: unknown): string {
  if (!raw || typeof raw !== "string") return "";
  let val = raw.trim();
  val = val.replace(/[,;\r\n]+$/, "").trim();
  while (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'")) ||
    (val.startsWith('`') && val.endsWith('`'))
  ) {
    val = val.slice(1, -1).trim();
    val = val.replace(/[,;\r\n]+$/, "").trim();
  }
  return val;
}

// Firebase Client / Server Environment Variables
const FIREBASE_API_KEY = cleanEnvValue(process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY);
const FIREBASE_PROJECT_ID = cleanEnvValue(process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID);
let rawDbId = cleanEnvValue(process.env.VITE_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID) || "(default)";
if (!rawDbId || rawDbId === FIREBASE_PROJECT_ID) {
  rawDbId = "(default)";
}
const FIREBASE_DATABASE_ID = rawDbId;
const FIREBASE_STORAGE_BUCKET = cleanEnvValue(process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET);

if (!FIREBASE_API_KEY || !FIREBASE_PROJECT_ID) {
  console.warn("⚠️ Firebase environment variables are missing. Please configure .env file.");
}

async function verifyFirebaseToken(idToken: string): Promise<{ uid: string; email?: string } | null> {
  if (!idToken || !FIREBASE_API_KEY) return null;
  try {
    const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!authRes.ok) return null;
    const data = (await authRes.json()) as any;
    if (data.users && data.users.length > 0) {
      return {
        uid: data.users[0].localId,
        email: data.users[0].email,
      };
    }
    return null;
  } catch (err) {
    console.error("Token verification error:", err);
    return null;
  }
}

const PORT = 3000;

// In-memory rate limiting map: ip -> { count: number, resetAt: number }
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

// Periodically clean up expired rate limit records
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

function geminiRateLimiter(maxRequests = 10, windowMs = 60 * 1000) {
  return (req: any, res: any, next: any) => {
    const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "anonymous";
    const ip = Array.isArray(rawIp) ? rawIp[0] : (typeof rawIp === "string" ? rawIp.split(",")[0].trim() : "anonymous");
    const now = Date.now();

    const record = rateLimitMap.get(ip);
    if (!record || now > record.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.set("Retry-After", retryAfterSeconds.toString());
      res.status(429).json({
        error: "Too Many Requests",
        message: `Batas permintaan Smart Caption terlampaui. Harap tunggu ${retryAfterSeconds} detik sebelum mencoba kembali.`,
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    record.count += 1;
    next();
  };
}

// Lazy initialize Gemini client on server-side only
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // API Routes
  app.get("/api/health", (_req: any, res: any) => {
    res.json({ status: "ok", service: "K-Click API", timestamp: new Date().toISOString() });
  });

  // AI Photobooth Caption & Slogan generator (Protected with rate limiter)
  app.post("/api/gemini/caption", geminiRateLimiter(10, 60 * 1000), async (req: any, res: any) => {
    try {
      const rawMood = typeof req.body?.mood === "string" ? req.body.mood.trim() : "cute";
      const rawFandom = typeof req.body?.fandom === "string" ? req.body.fandom.trim() : "K-Pop General";
      const rawLang = typeof req.body?.language === "string" ? req.body.language.trim() : "id";

      const mood = rawMood.substring(0, 80);
      const fandom = rawFandom.substring(0, 80);
      const language = rawLang.substring(0, 20);

      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          warning: "Layanan Smart Caption menggunakan rekomendasi template bawaan.",
          captions: [
            "Forever with you • 영원히 함께",
            "Best Memories with My Bias",
            "K-Click Official Photobooth Cut",
            "Shining brighter than stage lights!",
          ],
        });
      }

      const prompt = `You are a creative K-Pop photobooth sticker & caption writer for "K-Click".
Generate 4 short, cute, aesthetic sticker phrases / photo strip captions suitable for a photobooth printed strip.
Mood: ${mood}. Fandom/Theme: ${fandom}. Preferred language: ${language} (mix with aesthetic Korean/Hangul where appropriate).
Keep each caption under 35 characters. Do not use sparkle or star symbols.
Return valid JSON array of strings only.`;

      let responseText = "";
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });
        responseText = response.text || "";
      } catch (_primaryErr) {
        // Fallback to gemini-3.8-flash
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });
        responseText = response.text || "";
      }

      const cleanJson = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson || "[]");
      return res.json({ captions: Array.isArray(parsed) && parsed.length > 0 ? parsed : [
        "Forever with you • 영원히 함께",
        "Best Memories with My Bias",
        "K-Click Official Photobooth Cut",
        "Shining brighter than stage lights!",
      ] });
    } catch (err) {
      console.error("Gemini caption error:", err);
      return res.json({
        warning: "Layanan Smart Caption sedang sibuk. Menggunakan caption cadangan.",
        captions: [
          "Shine like a stage light • 영원히",
          "100% Bias Wrecked Today",
          "K-Click Special Cut Edition",
          "Sweetest moment captured",
        ],
      });
    }
  });

  // AI Product Listing Assistant for Creators (Protected with rate limiter)
  app.post("/api/gemini/assist-description", geminiRateLimiter(10, 60 * 1000), async (req: any, res: any) => {
    try {
      const rawName = typeof req.body?.productName === "string" ? req.body.productName.trim() : "";
      const rawCat = typeof req.body?.category === "string" ? req.body.category.trim() : "Photobooth";

      const productName = rawName.substring(0, 150);
      const category = rawCat.substring(0, 50);

      if (!productName) {
        return res.status(400).json({ error: "Nama produk harus diisi." });
      }

      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          warning: "Layanan asisten deskripsi menggunakan template bawaan.",
          description: `Digital ${category || "template"} bertema K-Pop dengan resolusi ultra high-definition. Cocok untuk photo strip, Twibbon, dan koleksi binder estetik!`,
          tags: "kpop, photobooth, aesthetic, template, idol, binder, photocard",
        });
      }

      const prompt = `You are a product copywriting assistant for K-Click, a digital K-Pop creative marketplace.
Product Name: "${productName}"
Category: "${category}"
Generate:
1. An appealing, youthful, aesthetic Indonesian product description (max 3 sentences) highlighting what's included and its aesthetic appeal.
2. A comma-separated list of 5-8 relevant search tags.
Output as JSON: { "description": "...", "tags": "..." }`;

      let responseText = "";
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });
        responseText = response.text || "";
      } catch (_primaryErr) {
        // Fallback to gemini-3.8-flash
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });
        responseText = response.text || "";
      }

      const cleanJson = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson || "{}");
      return res.json(parsed);
    } catch (err) {
      console.error("Gemini assist error:", err);
      return res.json({
        warning: "Layanan asisten deskripsi sedang sibuk. Menggunakan deskripsi cadangan.",
        description: `Template digital premium berkualitas tinggi dengan resolusi tajam, siap digunakan untuk photobooth strip atau digital art favoritmu!`,
        tags: "kpop, aesthetic, photobooth, frame, digitalart",
      });
    }
  });

  // Helper: Stream or deliver master file buffer safely from protected Storage
  async function sendMasterFile(res: any, product: any, userToken?: string) {
    const safeTitle = (product.name || "Master_Asset").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileSource = product.productFile;

    if (!fileSource) {
      return res.status(404).json({ 
        error: "Master product file belum tersedia di server penyimpanan terproteksi." 
      });
    }

    // Determine safe file extension
    const extMatch = typeof fileSource === "string" ? fileSource.split("?")[0].match(/\.([a-zA-Z0-9]+)$/) : null;
    const fileExt = extMatch ? extMatch[1].toLowerCase() : "png";
    const filename = `${safeTitle}_HD_Master.${fileExt}`;

    // 1. Data URLs (Base64) are strictly prohibited as production master files
    if (fileSource.startsWith("data:")) {
      return res.status(400).json({
        error: "Format file tidak valid. File master produk production wajib disimpan di Firebase Storage terproteksi, bukan Base64 data URL.",
      });
    }

    // 2. Storage Reference Path (templates/{creatorId}/{productId}/... or assets/{creatorId}/{productId}/...)
    let targetStoragePath: string | null = null;

    if (
      fileSource.startsWith("templates/") || 
      fileSource.startsWith("assets/") || 
      fileSource.startsWith("storage://") ||
      fileSource.startsWith("gs://")
    ) {
      const clean = fileSource.replace(/^(storage:\/\/|gs:\/\/[^/]+\/)/, "");
      // Prevent path traversal
      if (!clean.includes("..") && (clean.startsWith("templates/") || clean.startsWith("assets/"))) {
        targetStoragePath = clean;
      }
    } else if (
      (fileSource.startsWith("http://") || fileSource.startsWith("https://")) &&
      FIREBASE_STORAGE_BUCKET &&
      fileSource.includes(`firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/`)
    ) {
      // Decode path from Firebase Storage URL
      const pathMatch = fileSource.match(/\/o\/([^?#]+)/);
      if (pathMatch) {
        const decoded = decodeURIComponent(pathMatch[1]);
        if (!decoded.includes("..") && (decoded.startsWith("templates/") || decoded.startsWith("assets/"))) {
          targetStoragePath = decoded;
        }
      }
    } else if (fileSource.startsWith("http://") || fileSource.startsWith("https://")) {
      // Arbitrary external public URLs (e.g. unsplash or random websites) are strictly prohibited for master files
      return res.status(400).json({ 
        error: "Sumber file master tidak valid. File master produk wajib disimpan di Firebase Storage terproteksi." 
      });
    }

    if (!targetStoragePath) {
      return res.status(400).json({ 
        error: "Path file master produk tidak valid. Master file wajib berupa referensi Firebase Storage yang sah (templates/... atau assets/...).",
      });
    }

    // Verify that the storage path matches the product creator to prevent cross-account asset reference
    if (product.creatorId) {
      const isOwnedPath = targetStoragePath.startsWith(`templates/${product.creatorId}/`) || 
                          targetStoragePath.startsWith(`assets/${product.creatorId}/`);
      if (!isOwnedPath) {
        console.warn(`[Security Alert] Product ${product.id} references storage path outside creator ownership: ${targetStoragePath}`);
        return res.status(403).json({
          error: "Akses ditolak: Lokasi file master tidak sesuai dengan kepemilikan kreator produk ini."
        });
      }
    }

    if (!FIREBASE_STORAGE_BUCKET) {
      return res.status(500).json({ 
        error: "Konfigurasi FIREBASE_STORAGE_BUCKET belum diatur di server." 
      });
    }

    const storageUrl = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(targetStoragePath)}?alt=media`;
    try {
      const headers: Record<string, string> = {};
      if (userToken) {
        headers["Authorization"] = `Bearer ${userToken}`;
      }
      const sRes = await fetch(storageUrl, { headers });
      if (sRes.ok) {
        const buffer = Buffer.from(await sRes.arrayBuffer());
        res.set("Content-Type", sRes.headers.get("content-type") || "application/octet-stream");
        res.set("Content-Disposition", `attachment; filename="${filename}"`);
        res.send(buffer);
        return;
      } else {
        console.error(`Storage fetch failed with status: ${sRes.status} for path: ${targetStoragePath}`);
        res.status(sRes.status === 403 ? 403 : 404).json({
          error: "File master produk tidak dapat diakses di Firebase Storage. Pastikan file ada dan izin akses valid."
        });
        return;
      }
    } catch (e) {
      console.error("Storage download fetch error:", e);
      res.status(500).json({ 
        error: "Gagal mengambil file master dari Firebase Storage." 
      });
      return;
    }
  }

  // Secure Product Download Entitlement Endpoint
  app.get("/api/products/:productId/download", async (req: any, res: any) => {
    try {
      const { productId } = req.params;
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          error: "Akses ditolak: Diperlukan header 'Authorization: Bearer <token>' untuk mengunduh karya ini.",
        });
      }
      const rawToken = authHeader.substring(7).trim();
      if (!rawToken) {
        return res.status(401).json({
          error: "Akses ditolak: Token autentikasi tidak boleh kosong.",
        });
      }

      // 1. Authenticate caller strictly via Firebase ID token
      const callerUser = await verifyFirebaseToken(rawToken);
      if (!callerUser || !callerUser.uid) {
        return res.status(401).json({
          error: "Akses ditolak: Token autentikasi tidak valid atau sudah kedaluwarsa.",
        });
      }
      const callerUid = callerUser.uid;

      // 2. Retrieve Product Metadata strictly from Firestore
      let product: any = null;
      if (FIREBASE_PROJECT_ID) {
        try {
          const docUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents/products/${productId}${rawToken ? "" : `?key=${FIREBASE_API_KEY}`}`;
          const headers: Record<string, string> = {};
          if (rawToken) headers["Authorization"] = `Bearer ${rawToken}`;

          const fRes = await fetch(docUrl, { headers });
          if (fRes.ok) {
            const docJson = (await fRes.json()) as any;
            if (docJson && docJson.fields) {
              product = {
                id: productId,
                name: docJson.fields.name?.stringValue || "K-Click Master Asset",
                status: docJson.fields.status?.stringValue || "pending",
                price: docJson.fields.price
                  ? (docJson.fields.price.integerValue ? parseInt(docJson.fields.price.integerValue, 10) : docJson.fields.price.doubleValue)
                  : 0,
                creatorId: docJson.fields.creatorId?.stringValue || "",
                productFile: docJson.fields.productFile?.stringValue || "",
                previewImage: docJson.fields.previewImage?.stringValue || "",
              };
            }
          }
        } catch (e) {
          console.warn("Firestore product fetch warning:", e);
        }
      }

      if (!product) {
        return res.status(404).json({ error: "Produk digital tidak ditemukan di database." });
      }

      // Check Admin status
      let isAdmin = false;
      if (callerUid && rawToken && FIREBASE_PROJECT_ID) {
        try {
          const adminUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents/admins/${callerUid}`;
          const admRes = await fetch(adminUrl, {
            headers: { Authorization: `Bearer ${rawToken}` },
          });
          if (admRes.ok) {
            isAdmin = true;
          }
        } catch (e) {
          console.warn("Admin check warning:", e);
        }
      }

      const isCreator = Boolean(callerUid && callerUid === product.creatorId);
      const isApproved = product.status === "approved";

      // Product must be approved, unless the caller is the creator or an admin
      if (!isApproved && !isCreator && !isAdmin) {
        return res.status(403).json({ error: "Karya digital ini belum disetujui atau tidak tersedia untuk publik." });
      }

      // 3. Entitlement Checks: User must be authenticated
      if (!callerUid) {
        return res.status(401).json({
          error: "Akses ditolak: Silakan login terlebih dahulu untuk mengunduh karya ini.",
        });
      }

      // Creator owner or Admin have immediate access
      if (isCreator || isAdmin) {
        return sendMasterFile(res, product, rawToken);
      }

      // Free products are accessible to logged-in users
      if (product.price === 0) {
        return sendMasterFile(res, product, rawToken);
      }

      // 4. For paid products: check purchases/{callerUid}_{productId}
      let hasVerifiedPurchase = false;
      if (rawToken && FIREBASE_PROJECT_ID) {
        try {
          const purchaseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents/purchases/${callerUid}_${productId}`;
          const pRes = await fetch(purchaseUrl, {
            headers: { Authorization: `Bearer ${rawToken}` },
          });
          if (pRes.ok) {
            const pData = (await pRes.json()) as any;
            const fields = pData?.fields;
            if (fields) {
              const pBuyerId = fields.buyerId?.stringValue;
              const pProductId = fields.productId?.stringValue;
              const pPurchasedAt = fields.purchasedAt?.stringValue || fields.createdAt?.stringValue;

              // Strictly validate that buyerId equals authenticated user UID, productId matches requested item, and purchasedAt timestamp exists
              if (
                pBuyerId &&
                pBuyerId === callerUid &&
                pProductId &&
                pProductId === productId &&
                pPurchasedAt &&
                pPurchasedAt.length > 0
              ) {
                hasVerifiedPurchase = true;
              } else {
                console.warn(`[Security Alert] Invalid purchase entitlement fields for ${callerUid}_${productId}: buyerId=${pBuyerId}, productId=${pProductId}`);
              }
            }
          }
        } catch (e) {
          console.warn("Purchase doc check warning:", e);
        }
      }

      if (hasVerifiedPurchase) {
        return sendMasterFile(res, product, rawToken);
      }

      // 5. Check orders collection for informative status response
      // NOTE: Paid products strictly require a verified purchase entitlement document (purchases/{uid}_{productId}).
      // orders.status === 'paid' alone is NOT a bypass for paid master downloads.
      let orderStatus: string | null = null;
      if (rawToken && FIREBASE_PROJECT_ID) {
        try {
          const queryUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents:runQuery`;
          const qRes = await fetch(queryUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${rawToken}`,
            },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId: "orders" }],
                where: {
                  compositeFilter: {
                    op: "AND",
                    filters: [
                      {
                        fieldFilter: {
                          field: { fieldPath: "buyerId" },
                          op: "EQUAL",
                          value: { stringValue: callerUid },
                        },
                      },
                      {
                        fieldFilter: {
                          field: { fieldPath: "productId" },
                          op: "EQUAL",
                          value: { stringValue: productId },
                        },
                      },
                    ],
                  },
                },
                limit: 1,
              },
            }),
          });

          if (qRes.ok) {
            const qData = (await qRes.json()) as any[];
            if (Array.isArray(qData) && qData.length > 0 && qData[0].document) {
              orderStatus = qData[0].document.fields?.status?.stringValue || null;
            }
          }
        } catch (e) {
          console.warn("Order query warning:", e);
        }
      }

      if (orderStatus === "paid") {
        return res.status(403).json({
          error: "Akses ditolak: Dokumen purchase entitlement belum aktif untuk akun Anda. Silakan hubungi admin atau tunggu verifikasi resmi.",
        });
      }

      if (orderStatus === "waiting_verification") {
        return res.status(403).json({
          error: "Pembayaran Anda masih menunggu verifikasi admin. File akan langsung dapat diunduh begitu diverifikasi.",
        });
      }

      if (orderStatus === "pending") {
        return res.status(403).json({
          error: "Pesanan belum dibayar atau bukti pembayaran belum diunggah.",
        });
      }

      if (orderStatus === "rejected") {
        return res.status(403).json({
          error: "Bukti pembayaran pesanan ini sebelumnya ditolak admin. Silakan periksa atau lakukan pemesanan ulang.",
        });
      }

      return res.status(403).json({
        error: "Akses ditolak: Anda belum membeli karya digital ini.",
      });
    } catch (err: any) {
      console.error("Download entitlement error:", err);
      return res.status(500).json({ error: "Terjadi kesalahan sistem saat memproses unduhan." });
    }
  });

  // Authenticated Payment Proof Access Endpoint (Private to Buyer and Admin only)
  app.get("/api/payments/:orderId/proof", async (req: any, res: any) => {
    try {
      const { orderId } = req.params;
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          error: "Akses ditolak: Diperlukan header 'Authorization: Bearer <token>' untuk mengakses bukti pembayaran.",
        });
      }
      const rawToken = authHeader.substring(7).trim();
      if (!rawToken) {
        return res.status(401).json({ error: "Akses ditolak: Token autentikasi kosong." });
      }

      // 1. Authenticate caller strictly via Firebase ID token
      const callerUser = await verifyFirebaseToken(rawToken);
      if (!callerUser || !callerUser.uid) {
        return res.status(401).json({ error: "Akses ditolak: Token autentikasi tidak valid atau sudah kedaluwarsa." });
      }
      const callerUid = callerUser.uid;

      // 2. Check if caller is admin via Firestore admins/{callerUid}
      let isAdmin = false;
      if (FIREBASE_PROJECT_ID) {
        try {
          const adminUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents/admins/${callerUid}`;
          const admRes = await fetch(adminUrl, {
            headers: { Authorization: `Bearer ${rawToken}` },
          });
          if (admRes.ok) {
            isAdmin = true;
          }
        } catch (e) {
          console.warn("Admin check in proof fetch warning:", e);
        }
      }

      // 3. Fetch order document from Firestore
      let order: any = null;
      if (FIREBASE_PROJECT_ID) {
        try {
          const orderUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents/orders/${orderId}`;
          const ordRes = await fetch(orderUrl, {
            headers: { Authorization: `Bearer ${rawToken}` },
          });
          if (ordRes.ok) {
            const ordJson = (await ordRes.json()) as any;
            if (ordJson?.fields) {
              order = {
                id: orderId,
                buyerId: ordJson.fields.buyerId?.stringValue || "",
                proofImage: ordJson.fields.proofImage?.stringValue || "",
              };
            }
          }
        } catch (e) {
          console.warn("Order fetch in proof warning:", e);
        }
      }

      // Fallback: check payments/PAY-${orderId}
      if (!order && FIREBASE_PROJECT_ID) {
        try {
          const payUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents/payments/PAY-${orderId}`;
          const pRes = await fetch(payUrl, {
            headers: { Authorization: `Bearer ${rawToken}` },
          });
          if (pRes.ok) {
            const pJson = (await pRes.json()) as any;
            if (pJson?.fields) {
              order = {
                id: orderId,
                buyerId: pJson.fields.buyerId?.stringValue || "",
                proofImage: pJson.fields.proofImage?.stringValue || "",
              };
            }
          }
        } catch (e) {
          console.warn("Payment record fetch warning:", e);
        }
      }

      if (!order) {
        return res.status(404).json({ error: "Data pesanan tidak ditemukan di sistem." });
      }

      // 4. Strict Authorization: ONLY the buyer who created this order OR a verified admin can view
      if (order.buyerId !== callerUid && !isAdmin) {
        console.warn(`[Security Alert] Unauthorized proof access attempt by UID ${callerUid} on order ${orderId} owned by ${order.buyerId}`);
        return res.status(403).json({
          error: "Akses ditolak: Anda tidak memiliki wewenang untuk melihat bukti pembayaran ini.",
        });
      }

      const proofPath = order.proofImage;
      if (!proofPath) {
        return res.status(404).json({ error: "Bukti pembayaran belum diunggah untuk pesanan ini." });
      }

      // 5. Sanitize and validate storage path
      let cleanStoragePath: string | null = null;
      if (proofPath.startsWith("payments/")) {
        cleanStoragePath = proofPath;
      } else if (proofPath.includes("/o/")) {
        const match = proofPath.match(/\/o\/([^?#]+)/);
        if (match) {
          cleanStoragePath = decodeURIComponent(match[1]);
        }
      } else if (proofPath.startsWith("gs://") || proofPath.startsWith("storage://")) {
        cleanStoragePath = proofPath.replace(/^(storage:\/\/|gs:\/\/[^/]+\/)/, "");
      }

      if (!cleanStoragePath || cleanStoragePath.includes("..") || !cleanStoragePath.startsWith("payments/")) {
        return res.status(400).json({ error: "Lokasi file bukti pembayaran tidak valid atau tidak aman." });
      }

      // Non-admins can strictly only read from payments/{callerUid}/
      if (!isAdmin && !cleanStoragePath.startsWith(`payments/${callerUid}/`)) {
        console.warn(`[Security Alert] User ${callerUid} attempted to access proof outside their namespace: ${cleanStoragePath}`);
        return res.status(403).json({ error: "Akses ditolak: Path bukti pembayaran bukan milik Anda." });
      }

      if (!FIREBASE_STORAGE_BUCKET) {
        return res.status(500).json({ error: "FIREBASE_STORAGE_BUCKET belum dikonfigurasi di server." });
      }

      // Fetch file buffer from Firebase Storage with authentication
      const storageUrl = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(cleanStoragePath)}?alt=media`;
      const sRes = await fetch(storageUrl, {
        headers: { Authorization: `Bearer ${rawToken}` },
      });

      if (!sRes.ok) {
        console.error(`Storage fetch proof error: status ${sRes.status} for ${cleanStoragePath}`);
        return res.status(sRes.status === 403 ? 403 : 404).json({
          error: "File bukti pembayaran tidak dapat diakses di Firebase Storage.",
        });
      }

      const buffer = Buffer.from(await sRes.arrayBuffer());
      res.set("Content-Type", sRes.headers.get("content-type") || "image/jpeg");
      res.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
      res.send(buffer);
      return;
    } catch (err: any) {
      console.error("Payment proof access error:", err);
      return res.status(500).json({ error: "Terjadi kesalahan internal saat memuat bukti pembayaran." });
    }
  });

  // Vite middleware for dev or static for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: any, res: any) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`K-Click server running at http://localhost:${PORT}`);
  });
}

startServer();
