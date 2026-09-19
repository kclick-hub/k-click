import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  getDocFromServer,
  onSnapshot,
  orderBy,
  runTransaction
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  uploadString, 
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import firebaseConfig from '../config/firebaseConfig';
import { INITIAL_PRODUCTS } from '../data/mockProducts';
import { 
  UserProfile, 
  Product, 
  Order, 
  GalleryItem, 
  FavoriteItem, 
  Review,
  PaymentRecord,
  NotificationItem,
  ReportItem,
  CategoryItem,
  DownloadRecord,
  PurchaseRecord
} from '../types';

// Initialize Firebase SDK
export const app = initializeApp(firebaseConfig);
export const db = (!firebaseConfig.firestoreDatabaseId || firebaseConfig.firestoreDatabaseId === '(default)')
  ? getFirestore(app)
  : getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

export { onAuthStateChanged };
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Cloud Storage Helper with graceful fallback for public assets (avatars, previews)
export async function uploadFileToCloud(
  fileOrDataUrl: File | Blob | string,
  destinationPath: string
): Promise<string> {
  try {
    const storageRef = ref(storage, destinationPath);
    if (typeof fileOrDataUrl === 'string') {
      if (fileOrDataUrl.startsWith('data:')) {
        await uploadString(storageRef, fileOrDataUrl, 'data_url');
        return await getDownloadURL(storageRef);
      }
      return fileOrDataUrl; // Already a URL
    } else {
      await uploadBytes(storageRef, fileOrDataUrl);
      return await getDownloadURL(storageRef);
    }
  } catch (storageErr) {
    console.error('Firebase Storage upload error:', storageErr);
    throw new Error('Gagal mengunggah file ke Firebase Storage. Pastikan format file sesuai dan koneksi stabil.');
  }
}

// Protected Master Product File Uploader (Never exposes public download tokens to prevent unauthorized hotlinking)
export async function uploadProtectedProductFile(
  fileOrDataUrl: File | Blob | string,
  destinationPath: string
): Promise<string> {
  // Validate that destination path follows protected templates/ or assets/ convention
  if (!destinationPath.startsWith('templates/') && !destinationPath.startsWith('assets/')) {
    throw new Error('Destination path master file tidak valid. Wajib dimulai dengan templates/ atau assets/.');
  }

  try {
    const storageRef = ref(storage, destinationPath);
    if (typeof fileOrDataUrl === 'string') {
      if (fileOrDataUrl.startsWith('data:')) {
        await uploadString(storageRef, fileOrDataUrl, 'data_url');
        return destinationPath;
      }
      if (fileOrDataUrl.startsWith('http://') || fileOrDataUrl.startsWith('https://')) {
        throw new Error('URL publik eksternal tidak diizinkan sebagai master file produk digital.');
      }
      if (fileOrDataUrl.startsWith('templates/') || fileOrDataUrl.startsWith('assets/')) {
        return fileOrDataUrl;
      }
      throw new Error('Format file master produk tidak valid.');
    } else {
      await uploadBytes(storageRef, fileOrDataUrl);
      return destinationPath;
    }
  } catch (storageErr: any) {
    console.error('Protected Storage upload error:', storageErr);
    throw new Error(storageErr?.message || 'Gagal mengunggah file master produk ke protected Storage.');
  }
}

// Protected Payment Proof Uploader (Never exposes public download tokens to ensure strict privacy)
export async function uploadProtectedPaymentProofFile(
  fileOrBlob: File | Blob,
  destinationPath: string
): Promise<string> {
  if (!destinationPath.startsWith('payments/')) {
    throw new Error('Destination path bukti pembayaran wajib diawali dengan payments/.');
  }
  try {
    const storageRef = ref(storage, destinationPath);
    await uploadBytes(storageRef, fileOrBlob);
    return destinationPath;
  } catch (err: any) {
    console.error('Upload protected payment proof error:', err);
    throw new Error('Gagal mengunggah bukti pembayaran terproteksi ke Storage.');
  }
}

// Clean up orphan storage files if subsequent operations fail
export async function deleteProtectedStorageFile(storagePath: string): Promise<void> {
  if (!storagePath) return;
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn(`Gagal menghapus file storage (${storagePath}):`, err);
  }
}

// Authenticated Payment Proof Fetcher (Fetches via authorized backend endpoint)
export async function loadSecureProofBlobUrl(orderId: string): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Diperlukan autentikasi untuk mengakses bukti pembayaran privat.');
  }
  const response = await fetch(`/api/payments/${orderId}/proof`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    let errMessage = 'Gagal mengakses bukti pembayaran privat.';
    try {
      const errJson = await response.json();
      if (errJson && errJson.error) {
        errMessage = errJson.error;
      }
    } catch {
      // fallback
    }
    throw new Error(errMessage);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// ---------------------------------------------
// AUTHENTICATION SERVICES
// ---------------------------------------------
const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle(): Promise<UserProfile> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  return await syncUserProfile(user);
}

export async function registerWithEmail(
  email: string, 
  pass: string, 
  displayName: string
): Promise<UserProfile> {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  if (displayName) {
    await updateProfile(result.user, { displayName });
  }
  return await syncUserProfile(result.user, displayName);
}

export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return await syncUserProfile(result.user);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function checkIsAdmin(uid: string): Promise<boolean> {
  try {
    const adminSnap = await getDoc(doc(db, 'admins', uid));
    return adminSnap.exists();
  } catch {
    return false;
  }
}

export async function logoutUser() {
  await fbSignOut(auth);
}

async function syncUserProfile(user: FirebaseUser, overrideName?: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  // Strictly verify admin status through admins/{uid} document existence
  const isAdmin = await checkIsAdmin(user.uid);

  if (!snap.exists()) {
    const newUser: UserProfile = {
      id: user.uid,
      name: overrideName || user.displayName || user.email?.split('@')[0] || 'K-Pop Fan',
      email: user.email || '',
      profileImage: user.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.uid}`,
      role: isAdmin ? 'admin' : 'user',
      credits: 15,
      createdAt: new Date().toISOString(),
    };
    await setDoc(userRef, newUser);
    return newUser;
  } else {
    const existing = snap.data() as UserProfile;
    const shouldBeAdmin = isAdmin;
    if (shouldBeAdmin && existing.role !== 'admin') {
      await updateDoc(userRef, { role: 'admin' });
      existing.role = 'admin';
    } else if (!shouldBeAdmin && existing.role === 'admin') {
      await updateDoc(userRef, { role: 'user' });
      existing.role = 'user';
    }
    return existing;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}`);
    return null;
  }
}

export async function updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

export async function getAllUsersForAdmin(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => d.data() as UserProfile);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
    return [];
  }
}

export async function updateUserCredits(userId: string, newCredits: number): Promise<void> {
  try {
    const safeCredits = Math.max(0, Math.min(500, Math.floor(newCredits)));
    await updateDoc(doc(db, 'users', userId), { credits: safeCredits });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

// ---------------------------------------------
// PRODUCTS SERVICES
// ---------------------------------------------
export async function createProduct(product: Product): Promise<void> {
  try {
    await setDoc(doc(db, 'products', product.id), product);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `products/${product.id}`);
  }
}

export async function getApprovedProducts(): Promise<Product[]> {
  try {
    const q = query(collection(db, 'products'), where('status', '==', 'approved'));
    const snap = await getDocs(q);
    if (snap.empty) {
      return INITIAL_PRODUCTS;
    }
    return snap.docs.map(d => d.data() as Product);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'products');
    return INITIAL_PRODUCTS;
  }
}

export async function getAllProductsForAdmin(): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(db, 'products'));
    if (snap.empty) {
      return INITIAL_PRODUCTS;
    }
    return snap.docs.map(d => d.data() as Product);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'products');
    return INITIAL_PRODUCTS;
  }
}

export async function getCreatorProducts(creatorId: string): Promise<Product[]> {
  try {
    const q = query(collection(db, 'products'), where('creatorId', '==', creatorId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Product);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'products');
    return [];
  }
}

export async function updateProductStatus(
  productId: string, 
  status: Product['status'], 
  rejectionReason?: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'products', productId), {
      status,
      rejectionReason: rejectionReason || null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
  }
}

export async function updateProductDetails(
  productId: string,
  updates: Partial<Product>,
  userId?: string
): Promise<void> {
  try {
    const prodRef = doc(db, 'products', productId);
    const snap = await getDoc(prodRef);
    if (!snap.exists()) {
      throw new Error('Karya tidak ditemukan di database.');
    }
    const current = snap.data() as Product;
    if (userId && current.creatorId !== userId) {
      const isAdminUser = await checkIsAdmin(userId);
      if (!isAdminUser) {
        throw new Error('Akses ditolak: Anda hanya berhak mengedit karya milik Anda sendiri.');
      }
    }

    const sanitizedUpdates: Partial<Product> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    // Never allow changing immutable fields through this function
    delete sanitizedUpdates.id;
    delete sanitizedUpdates.creatorId;
    delete sanitizedUpdates.salesCount;

    await updateDoc(prodRef, sanitizedUpdates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
    throw err;
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
  }
}

// ---------------------------------------------
// ORDERS & PAYMENTS SERVICES
// ---------------------------------------------
export async function createOrder(order: Order): Promise<void> {
  try {
    // Validate order against authentic Firestore product record to prevent client-side tampering
    const prodRef = doc(db, 'products', order.productId);
    const prodSnap = await getDoc(prodRef);
    if (!prodSnap.exists()) {
      throw new Error('Produk tidak ditemukan di sistem.');
    }
    const product = prodSnap.data() as Product;
    if (product.status !== 'approved') {
      throw new Error('Produk belum disetujui untuk transaksi.');
    }

    // Never accept Base64 payment proof in Firestore
    if (order.proofImage && order.proofImage.startsWith('data:')) {
      throw new Error('Bukti pembayaran tidak boleh berupa Base64. Wajib melalui Firebase Storage.');
    }

    const isFree = product.price === 0;
    const verifiedOrder: Order = {
      ...order,
      amount: product.price, // enforce authentic product price
      creatorId: product.creatorId, // enforce authentic creator ID
      productName: product.name,
      status: isFree ? 'paid' : (order.proofImage ? 'waiting_verification' : 'pending'),
      verifiedAt: isFree ? new Date().toISOString() : undefined,
    };

    await setDoc(doc(db, 'orders', order.id), verifiedOrder);

    // If order has proof image and is paid item, also create payment record
    if (verifiedOrder.proofImage && !isFree) {
      await createPaymentRecord({
        id: `PAY-${order.id}`,
        orderId: order.id,
        buyerId: order.buyerId,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        productId: order.productId,
        productName: product.name,
        amount: product.price,
        proofImage: verifiedOrder.proofImage,
        status: 'waiting_verification',
        createdAt: new Date().toISOString(),
      });
    } else if (isFree) {
      // Free item immediate purchase entitlement
      const purchaseId = `${order.buyerId}_${order.productId}`;
      await setDoc(doc(db, 'purchases', purchaseId), {
        id: purchaseId,
        buyerId: order.buyerId,
        productId: order.productId,
        productName: product.name,
        creatorId: product.creatorId,
        creatorName: product.creatorName,
        orderId: order.id,
        amount: 0,
        licenseType: product.licenseType || 'Personal Use',
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `orders/${order.id}`);
    throw err;
  }
}

export async function getUserOrders(buyerId: string): Promise<Order[]> {
  try {
    const q = query(collection(db, 'orders'), where('buyerId', '==', buyerId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Order);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'orders');
    return [];
  }
}

export async function getCreatorOrders(creatorId: string): Promise<Order[]> {
  try {
    const q = query(collection(db, 'orders'), where('creatorId', '==', creatorId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Order);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'orders');
    return [];
  }
}

export async function getAllOrdersForAdmin(): Promise<Order[]> {
  try {
    const snap = await getDocs(collection(db, 'orders'));
    return snap.docs.map(d => d.data() as Order);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'orders');
    return [];
  }
}

export async function updateOrderStatus(
  orderId: string, 
  status: Order['status'], 
  rejectionReason?: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status,
      rejectionReason: rejectionReason || null,
      verifiedAt: status === 'paid' ? new Date().toISOString() : null,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
  }
}

export async function uploadOrderProof(orderId: string, proofImage: string, buyerId?: string): Promise<void> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      throw new Error('Pesanan tidak ditemukan.');
    }
    const orderData = orderSnap.data() as Order;
    const currentUid = buyerId || auth.currentUser?.uid || '';
    if (orderData.buyerId !== currentUid) {
      throw new Error('Akses ditolak: pesanan bukan milik Anda.');
    }

    await updateDoc(orderRef, {
      proofImage,
      status: 'waiting_verification',
    });

    // Create or update payment doc matching order details
    const payId = `PAY-${orderId}`;
    await setDoc(doc(db, 'payments', payId), {
      id: payId,
      orderId,
      buyerId: orderData.buyerId,
      buyerName: orderData.buyerName,
      buyerEmail: orderData.buyerEmail,
      productId: orderData.productId,
      productName: orderData.productName,
      amount: orderData.amount,
      proofImage,
      status: 'waiting_verification',
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    throw err;
  }
}

// Payments collection
export async function createPaymentRecord(payment: PaymentRecord): Promise<void> {
  try {
    await setDoc(doc(db, 'payments', payment.id), payment);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `payments/${payment.id}`);
  }
}

export async function getAllPaymentsForAdmin(): Promise<PaymentRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'payments'));
    return snap.docs.map(d => d.data() as PaymentRecord);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'payments');
    return [];
  }
}

export async function verifyPayment(
  paymentId: string, 
  orderId: string, 
  status: 'approved' | 'rejected', 
  rejectionReason?: string,
  adminId?: string
): Promise<void> {
  const verifiedBy = adminId || auth.currentUser?.uid || 'admin';
  const nowIso = new Date().toISOString();

  try {
    await runTransaction(db, async (transaction) => {
      // 1. TRANSACTION READS (Must all be performed before any write operations)
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error(`Pesanan dengan ID ${orderId} tidak ditemukan.`);
      }

      const orderData = orderSnap.data() as Order;
      if (!orderData.buyerId) {
        throw new Error(`Data pesanan ${orderId} tidak valid: ID pembeli (buyerId) tidak ditemukan.`);
      }
      if (!orderData.productId) {
        throw new Error(`Data pesanan ${orderId} tidak valid: ID produk (productId) tidak ditemukan.`);
      }

      const paymentRef = doc(db, 'payments', paymentId);
      const paymentSnap = await transaction.get(paymentRef);

      const productRef = doc(db, 'products', orderData.productId);
      const productSnap = await transaction.get(productRef);
      const productData = productSnap.exists() ? (productSnap.data() as Product) : null;

      const purchaseId = `${orderData.buyerId}_${orderData.productId}`;
      const purchaseRef = doc(db, 'purchases', purchaseId);
      const purchaseSnap = await transaction.get(purchaseRef);

      // 2. TRANSACTION WRITES (Executed atomically)
      if (status === 'approved') {
        // Step A: Set payment status to verified/approved
        if (paymentSnap.exists()) {
          transaction.update(paymentRef, {
            status: 'approved',
            verifiedBy,
            verifiedAt: nowIso,
            rejectionReason: null,
          });
        } else {
          transaction.set(paymentRef, {
            id: paymentId,
            orderId,
            buyerId: orderData.buyerId,
            amount: orderData.amount,
            status: 'approved',
            verifiedBy,
            verifiedAt: nowIso,
            rejectionReason: null,
            createdAt: orderData.createdAt || nowIso,
          });
        }

        // Step B: Set order status to paid
        transaction.update(orderRef, {
          status: 'paid',
          rejectionReason: null,
          updatedAt: nowIso,
          verifiedAt: nowIso,
          verifiedBy,
        });

        // Step C: Atomically create or update purchases/{buyerId}_{productId} entitlement
        const existingPurchase = purchaseSnap.exists() ? purchaseSnap.data() : null;
        transaction.set(
          purchaseRef,
          {
            id: purchaseId,
            buyerId: orderData.buyerId,
            productId: orderData.productId,
            productName: orderData.productName || productData?.name || 'Karya Digital',
            creatorId: orderData.creatorId || productData?.creatorId || '',
            orderId: orderData.id,
            amount: orderData.amount,
            licenseType: orderData.licenseType || productData?.licenseType || 'Personal Use',
            purchasedAt: existingPurchase?.purchasedAt || nowIso,
            createdAt: existingPurchase?.createdAt || nowIso,
            updatedAt: nowIso,
          },
          { merge: true }
        );
      } else {
        // Rejection path
        if (paymentSnap.exists()) {
          transaction.update(paymentRef, {
            status: 'rejected',
            verifiedBy,
            verifiedAt: nowIso,
            rejectionReason: rejectionReason || 'Bukti pembayaran tidak valid atau dana belum masuk.',
          });
        } else {
          transaction.set(paymentRef, {
            id: paymentId,
            orderId,
            buyerId: orderData.buyerId,
            amount: orderData.amount,
            status: 'rejected',
            verifiedBy,
            verifiedAt: nowIso,
            rejectionReason: rejectionReason || 'Bukti pembayaran tidak valid atau dana belum masuk.',
            createdAt: orderData.createdAt || nowIso,
          });
        }

        transaction.update(orderRef, {
          status: 'rejected',
          rejectionReason: rejectionReason || 'Bukti pembayaran tidak valid atau dana belum masuk.',
          updatedAt: nowIso,
        });
      }
    });
  } catch (err: any) {
    console.error('Payment verification transaction failed:', err);
    handleFirestoreError(err, OperationType.UPDATE, `payments/${paymentId}`);
    throw err;
  }
}

// ---------------------------------------------
// PURCHASES ENTITLEMENT SERVICES
// ---------------------------------------------
export async function getUserPurchases(userId: string): Promise<PurchaseRecord[]> {
  try {
    const q = query(collection(db, 'purchases'), where('buyerId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as PurchaseRecord);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'purchases');
    return [];
  }
}

export async function checkUserPurchased(userId: string, productId: string): Promise<boolean> {
  try {
    const purchaseSnap = await getDoc(doc(db, 'purchases', `${userId}_${productId}`));
    return purchaseSnap.exists();
  } catch {
    return false;
  }
}

// ---------------------------------------------
// GALLERY SERVICES
// ---------------------------------------------
export async function saveGalleryItem(item: GalleryItem): Promise<void> {
  try {
    await setDoc(doc(db, 'gallery', item.id), item);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `gallery/${item.id}`);
  }
}

export async function getUserGallery(userId: string): Promise<GalleryItem[]> {
  try {
    const q = query(collection(db, 'gallery'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as GalleryItem);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'gallery');
    return [];
  }
}

export async function deleteGalleryItem(itemId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'gallery', itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `gallery/${itemId}`);
  }
}

// ---------------------------------------------
// FAVORITES SERVICES
// ---------------------------------------------
export async function toggleFavorite(userId: string, productId: string, isFav: boolean): Promise<void> {
  const favId = `${userId}_${productId}`;
  try {
    if (isFav) {
      const fav: FavoriteItem = { id: favId, userId, productId, createdAt: new Date().toISOString() };
      await setDoc(doc(db, 'favorites', favId), fav);
    } else {
      await deleteDoc(doc(db, 'favorites', favId));
    }
  } catch (err) {
    handleFirestoreError(err, isFav ? OperationType.CREATE : OperationType.DELETE, `favorites/${favId}`);
  }
}

export async function getUserFavorites(userId: string): Promise<FavoriteItem[]> {
  try {
    const q = query(collection(db, 'favorites'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as FavoriteItem);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'favorites');
    return [];
  }
}

// ---------------------------------------------
// REVIEWS SERVICES
// ---------------------------------------------
export async function getProductReviews(productId: string): Promise<Review[]> {
  try {
    const q = query(collection(db, 'reviews'), where('productId', '==', productId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Review);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'reviews');
    return [];
  }
}

export async function submitProductReview(review: Review): Promise<void> {
  const reviewDocId = `${review.userId}_${review.productId}`;
  try {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid || currentUid !== review.userId) {
      throw new Error('Akses ditolak: Anda hanya dapat mengirim ulasan untuk akun Anda sendiri.');
    }

    // Security check: Only verified purchase entitlement, free products, or admin can submit reviews
    const isPurchased = await checkUserPurchased(review.userId, review.productId);
    const prodSnap = await getDoc(doc(db, 'products', review.productId));
    const prodData = prodSnap.exists() ? (prodSnap.data() as Product) : null;
    const isFree = prodData?.price === 0;
    const isAdmin = await checkIsAdmin(review.userId);

    if (!isPurchased && !isFree && !isAdmin) {
      throw new Error('Hanya pengguna yang memiliki hak kepemilikan resmi (Purchases Entitlement) yang dapat memberikan ulasan.');
    }

    const validRating = Math.max(1, Math.min(5, Math.round(Number(review.rating) || 5)));

    let finalOrderId = review.orderId;
    if (!finalOrderId) {
      const qOrd = query(
        collection(db, 'orders'),
        where('buyerId', '==', review.userId),
        where('productId', '==', review.productId),
        where('status', '==', 'paid')
      );
      const ordSnap = await getDocs(qOrd);
      if (!ordSnap.empty) {
        finalOrderId = ordSnap.docs[0].id;
      }
    }

    await setDoc(doc(db, 'reviews', reviewDocId), {
      ...review,
      id: reviewDocId,
      orderId: finalOrderId || (isFree ? 'FREE_CLAIM' : undefined),
      rating: validRating,
      createdAt: review.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Recalculate average rating & review count for product from REAL review documents in Firestore
    const allRevsSnap = await getDocs(
      query(collection(db, 'reviews'), where('productId', '==', review.productId))
    );
    const revs = allRevsSnap.docs.map(d => d.data() as Review);
    if (revs.length > 0) {
      const sum = revs.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
      const avg = Number((sum / revs.length).toFixed(1));
      await updateDoc(doc(db, 'products', review.productId), {
        rating: avg,
        reviewCount: revs.length,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `reviews/${reviewDocId}`);
    throw err;
  }
}

// ---------------------------------------------
// NOTIFICATIONS SERVICES
// ---------------------------------------------
export async function createNotification(notif: NotificationItem): Promise<void> {
  try {
    await setDoc(doc(db, 'notifications', notif.id), notif);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `notifications/${notif.id}`);
  }
}

export async function getUserNotifications(userId: string): Promise<NotificationItem[]> {
  try {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as NotificationItem);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'notifications');
    return [];
  }
}

export async function markNotificationAsRead(notifId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notifId}`);
  }
}

// ---------------------------------------------
// REPORTS & FEEDBACK SERVICES
// ---------------------------------------------
export async function submitReport(report: ReportItem): Promise<void> {
  try {
    await setDoc(doc(db, 'reports', report.id), report);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `reports/${report.id}`);
  }
}

export async function getAllReportsForAdmin(): Promise<ReportItem[]> {
  try {
    const snap = await getDocs(collection(db, 'reports'));
    return snap.docs.map(d => d.data() as ReportItem);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'reports');
    return [];
  }
}

export async function updateReportStatus(reportId: string, status: ReportItem['status']): Promise<void> {
  try {
    await updateDoc(doc(db, 'reports', reportId), { status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
  }
}

// ---------------------------------------------
// CATEGORIES SERVICES
// ---------------------------------------------
export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'cat-photobooth', name: 'Photobooth', slug: 'photobooth', description: 'Template & frame strip multi-cut' },
  { id: 'cat-frame', name: 'Frame', slug: 'frame', description: 'Twibbon & bingkai foto transparan' },
  { id: 'cat-sticker', name: 'Sticker', slug: 'sticker', description: 'Stiker fandom, idol, dan ornamen lucu' },
  { id: 'cat-illustration', name: 'Illustration', slug: 'illustration', description: 'Fanart & karya ilustrasi K-Pop' },
  { id: 'cat-wallpaper', name: 'Wallpaper', slug: 'wallpaper', description: 'Wallpaper layar ponsel & desktop' },
  { id: 'cat-printing', name: 'Printing Design', slug: 'printing-design', description: 'Desain siap cetak photocard & postcard' },
  { id: 'cat-custom', name: 'Custom Design', slug: 'custom-design', description: 'Karya pesanan khusus kreator' },
];

export async function getCategories(): Promise<CategoryItem[]> {
  try {
    const snap = await getDocs(collection(db, 'categories'));
    if (snap.empty) {
      return DEFAULT_CATEGORIES;
    }
    return snap.docs.map(d => d.data() as CategoryItem);
  } catch (err) {
    console.warn('Categories fetch from Firestore returned fallback defaults:', err);
    return DEFAULT_CATEGORIES;
  }
}

export async function saveCategory(category: CategoryItem): Promise<void> {
  try {
    await setDoc(doc(db, 'categories', category.id), category);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `categories/${category.id}`);
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `categories/${categoryId}`);
  }
}

// ---------------------------------------------
// DOWNLOAD HISTORY SERVICES
// ---------------------------------------------
export async function recordDownload(record: DownloadRecord): Promise<void> {
  try {
    await setDoc(doc(db, 'downloads', record.id), record);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `downloads/${record.id}`);
  }
}

export async function getUserDownloads(userId: string): Promise<DownloadRecord[]> {
  try {
    const q = query(collection(db, 'downloads'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as DownloadRecord);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'downloads');
    return [];
  }
}

// ---------------------------------------------
// PRODUCT VIEWS ANALYTICS
// ---------------------------------------------
export async function recordProductView(productId: string, userId?: string): Promise<void> {
  try {
    const viewId = `pv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await setDoc(doc(db, 'productViews', viewId), {
      id: viewId,
      productId,
      userId: userId || 'anonymous',
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    // Non-blocking view tracking
  }
}

export async function getProductViewsCount(productId: string): Promise<number> {
  try {
    const q = query(collection(db, 'productViews'), where('productId', '==', productId));
    const snap = await getDocs(q);
    return snap.size;
  } catch {
    return 0;
  }
}

export async function getCreatorTotalViews(productIds: string[]): Promise<number> {
  if (productIds.length === 0) return 0;
  try {
    const snap = await getDocs(collection(db, 'productViews'));
    const allViews = snap.docs.map(d => d.data() as { productId: string });
    return allViews.filter(v => productIds.includes(v.productId)).length;
  } catch {
    return 0;
  }
}

