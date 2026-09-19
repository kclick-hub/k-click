import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  UserProfile, 
  AppMode, 
  Product, 
  Order, 
  GalleryItem, 
  PaymentRecord,
  NotificationItem,
  ReportItem,
  CategoryItem,
  DownloadRecord,
  PurchaseRecord,
  PhotoboothTemplate
} from '../types';
import { PHOTOBOOTH_TEMPLATES } from '../data/mockTemplates';
import { 
  auth, 
  onAuthStateChanged, 
  logoutUser,
  getUserProfile, 
  getApprovedProducts, 
  getAllProductsForAdmin,
  getCreatorProducts,
  createProduct as fbCreateProduct,
  updateProductStatus as fbUpdateProductStatus,
  updateProductDetails as fbUpdateProductDetails,
  createOrder as fbCreateOrder,
  getUserOrders,
  getAllOrdersForAdmin,
  uploadOrderProof as fbUploadOrderProof,
  verifyPayment as fbVerifyPayment,
  getAllPaymentsForAdmin,
  saveGalleryItem,
  getUserGallery,
  deleteGalleryItem,
  toggleFavorite as fbToggleFavorite,
  getUserFavorites,
  getUserNotifications,
  markNotificationAsRead,
  createNotification,
  getCategories,
  saveCategory,
  deleteCategory as fbDeleteCategory,
  getAllReportsForAdmin,
  submitReport as fbSubmitReport,
  updateReportStatus as fbUpdateReportStatus,
  recordDownload as fbRecordDownload,
  getUserDownloads,
  getUserPurchases,
  deleteProduct as fbDeleteProduct,
  updateUserProfile as fbUpdateUserProfile,
  updateUserCredits as fbUpdateUserCredits,
  checkIsAdmin
} from '../services/firebase';

interface Toast {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
}

interface AppContextType {
  user: UserProfile | null;
  authLoading: boolean;
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  products: Product[];
  allProducts: Product[];
  orders: Order[];
  allOrders: Order[];
  payments: PaymentRecord[];
  purchases: PurchaseRecord[];
  gallery: GalleryItem[];
  favorites: string[]; // product IDs
  categories: CategoryItem[];
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  reports: ReportItem[];
  downloads: DownloadRecord[];
  credits: number;
  useCredits: (amount: number) => boolean;
  addCredits: (amount: number) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  logout: () => Promise<void>;
  addToGallery: (item: GalleryItem) => Promise<void>;
  removeFromGallery: (id: string) => Promise<void>;
  addNewProduct: (product: Product) => Promise<void>;
  updateProductStatus: (id: string, status: Product['status'], reason?: string) => Promise<void>;
  updateProductDetails: (id: string, updates: Partial<Product>) => Promise<boolean>;
  deleteProduct: (productId: string) => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<boolean>;
  createOrder: (order: Order) => Promise<void>;
  updateOrderPayment: (orderId: string, proofImage: string) => Promise<void>;
  verifyOrderPayment: (orderId: string, status: Order['status'], reason?: string) => Promise<void>;
  downloadProductFile: (product: Product, orderId?: string) => Promise<boolean>;
  submitReport: (report: Omit<ReportItem, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateReportStatus: (id: string, status: ReportItem['status']) => Promise<void>;
  addCategory: (category: CategoryItem) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  isFavorite: (productId: string) => boolean;
  toggleFav: (productId: string) => Promise<void>;
  toggleFavorite: (productId: string) => Promise<void>;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  selectedProductForDetail: Product | null;
  setSelectedProductForDetail: (product: Product | null) => void;
  selectedProductForCheckout: Product | null;
  setSelectedProductForCheckout: (product: Product | null) => void;
  isUserProfileModalOpen: boolean;
  setIsUserProfileModalOpen: (open: boolean) => void;
  selectedCreatorForModal: { creatorId: string; creatorName: string; creatorAvatar?: string } | null;
  setSelectedCreatorForModal: (creator: { creatorId: string; creatorName: string; creatorAvatar?: string } | null) => void;
  reportProductTarget: Product | null;
  setReportProductTarget: (product: Product | null) => void;
  selectedPhotoboothTemplate: PhotoboothTemplate;
  setSelectedPhotoboothTemplate: (template: PhotoboothTemplate) => void;
  launchPhotoboothWithTemplate: (template: PhotoboothTemplate) => void;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start as Guest on Home page by default as instructed!
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [mode, setMode] = useState<AppMode>('buyer');
  const [activeTab, setActiveTab] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [credits, setCredits] = useState<number>(15);

  // UI Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [selectedCreatorForModal, setSelectedCreatorForModal] = useState<{
    creatorId: string;
    creatorName: string;
    creatorAvatar?: string;
  } | null>(null);
  const [reportProductTarget, setReportProductTarget] = useState<Product | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [selectedProductForCheckout, setSelectedProductForCheckout] = useState<Product | null>(null);
  const [selectedPhotoboothTemplate, setSelectedPhotoboothTemplate] = useState<PhotoboothTemplate>(PHOTOBOOTH_TEMPLATES[0]);

  const launchPhotoboothWithTemplate = useCallback((template: PhotoboothTemplate) => {
    setSelectedPhotoboothTemplate(template);
    setActiveTab('photobooth');
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Fetch Public Data (Products & Categories)
  const loadPublicData = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([
        getApprovedProducts(),
        getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      console.warn('Error loading public data:', err);
    }
  }, []);

  // Fetch User-Specific Data
  const loadUserData = useCallback(async (currentUserId: string, isAdmin: boolean) => {
    try {
      const [userGal, userOrds, userFavs, userNotifs, userDowns, userPurchases] = await Promise.all([
        getUserGallery(currentUserId),
        getUserOrders(currentUserId),
        getUserFavorites(currentUserId),
        getUserNotifications(currentUserId),
        getUserDownloads(currentUserId),
        getUserPurchases(currentUserId),
      ]);

      setGallery(userGal);
      setOrders(userOrds);
      setFavorites(userFavs.map((f) => f.productId));
      setNotifications(userNotifs);
      setDownloads(userDowns);
      setPurchases(userPurchases);

      // If Admin, also load platform-wide datasets
      if (isAdmin) {
        const [allProds, allOrds, allPays, allReps] = await Promise.all([
          getAllProductsForAdmin(),
          getAllOrdersForAdmin(),
          getAllPaymentsForAdmin(),
          getAllReportsForAdmin(),
        ]);
        setAllProducts(allProds);
        setAllOrders(allOrds);
        setPayments(allPays);
        setReports(allReps);
      }
    } catch (err) {
      console.warn('Error loading user-specific data:', err);
    }
  }, []);

  // Master Refresh
  const refreshData = useCallback(async () => {
    await loadPublicData();
    if (user) {
      await loadUserData(user.id, user.role === 'admin');
    }
  }, [loadPublicData, loadUserData, user]);

  // Auth State Listener
  useEffect(() => {
    loadPublicData();

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await getUserProfile(fbUser.uid);
          const isAdmin = await checkIsAdmin(fbUser.uid);
          const resolvedProfile: UserProfile = profile || {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'K-Pop Fan',
            email: fbUser.email || '',
            profileImage: fbUser.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${fbUser.uid}`,
            role: isAdmin ? 'admin' : 'user',
            credits: 15,
            createdAt: new Date().toISOString(),
          };

          setUser(resolvedProfile);
          setCredits(resolvedProfile.credits);
          await loadUserData(resolvedProfile.id, resolvedProfile.role === 'admin');
        } catch (e) {
          console.error('Auth state change error:', e);
        }
      } else {
        // Guest mode
        setUser(null);
        setGallery([]);
        setOrders([]);
        setFavorites([]);
        setNotifications([]);
        setDownloads([]);
      }
      setAuthLoading(false);
    });

    return () => unsub();
  }, [loadPublicData, loadUserData]);

  // Credits (Photobooth complimentary internal tokens, non-monetary)
  const useCredits = (amount: number): boolean => {
    if (typeof amount !== 'number' || amount <= 0) return false;
    const safeAmount = Math.floor(amount);
    if (credits >= safeAmount) {
      const nextCredits = Math.max(0, credits - safeAmount);
      setCredits(nextCredits);
      if (user) {
        setUser({ ...user, credits: nextCredits });
        fbUpdateUserCredits(user.id, nextCredits);
      }
      showToast(`Menggunakan ${safeAmount} credit. Sisa: ${nextCredits}`, 'info');
      return true;
    }
    showToast(`Credit tidak cukup. Dibutuhkan ${safeAmount} credit.`, 'error');
    return false;
  };

  const addCredits = (amount: number) => {
    // Strict bounds: complimentary bonus max increment 10 per claim, maximum total cap 500
    if (typeof amount !== 'number' || amount <= 0 || amount > 10) {
      showToast('Klaim bonus kredit tidak valid (maksimal 10 kredit per klaim bonus).', 'error');
      return;
    }
    const safeAmount = Math.min(10, Math.floor(amount));
    const nextCredits = Math.min(500, credits + safeAmount);
    setCredits(nextCredits);
    if (user) {
      setUser({ ...user, credits: nextCredits });
      fbUpdateUserCredits(user.id, nextCredits);
    }
    showToast(`Bonus harian +${safeAmount} credits berhasil diklaim!`, 'success');
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // safe ignore
    }
    setUser(null);
    setMode('buyer');
    setActiveTab('home');
    setGallery([]);
    setOrders([]);
    setFavorites([]);
    setNotifications([]);
    setDownloads([]);
    showToast('Berhasil keluar dari akun.', 'info');
  };

  // Gallery actions
  const addToGallery = async (item: GalleryItem) => {
    setGallery((prev) => [item, ...prev]);
    await saveGalleryItem(item);
    showToast('Berhasil disimpan ke My Gallery!', 'success');
  };

  const removeFromGallery = async (id: string) => {
    setGallery((prev) => prev.filter((i) => i.id !== id));
    await deleteGalleryItem(id);
    showToast('Item berhasil dihapus dari galeri.', 'info');
  };

  // Product actions
  const addNewProduct = async (product: Product) => {
    setProducts((prev) => [product, ...prev]);
    setAllProducts((prev) => [product, ...prev]);
    await fbCreateProduct(product);
    showToast('Karya berhasil diupload & menunggu verifikasi admin!', 'success');

    // Notification for creator
    if (user) {
      await createNotification({
        id: `notif-${Date.now()}`,
        userId: user.id,
        type: 'system',
        title: 'Karya Berhasil Diunggah',
        message: `Karya "${product.name}" sedang ditinjau oleh Admin K-Click.`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const updateProductStatus = async (id: string, status: Product['status'], reason?: string) => {
    setProducts((prev) =>
      status === 'approved'
        ? prev.map((p) => (p.id === id ? { ...p, status, rejectionReason: reason } : p))
        : prev.filter((p) => p.id !== id)
    );
    setAllProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status, rejectionReason: reason } : p))
    );

    await fbUpdateProductStatus(id, status, reason);

    const target = allProducts.find((p) => p.id === id);
    if (target) {
      // Send notification to creator
      await createNotification({
        id: `notif-${Date.now()}`,
        userId: target.creatorId,
        type: status === 'approved' ? 'product_approved' : 'product_rejected',
        title: status === 'approved' ? 'Karya Disetujui! 🎉' : 'Karya Memerlukan Perbaikan',
        message:
          status === 'approved'
            ? `Selamat! Karya "${target.name}" telah disetujui dan kini aktif di Marketplace.`
            : `Karya "${target.name}" ditolak dengan alasan: ${reason || 'Tidak memenuhi kriteria'}.`,
        read: false,
        linkTab: 'creator-studio',
        createdAt: new Date().toISOString(),
      });
    }

    showToast(`Status karya berhasil diperbarui menjadi ${status.toUpperCase()}`, 'info');
  };

  const updateProductDetails = async (id: string, updates: Partial<Product>): Promise<boolean> => {
    try {
      await fbUpdateProductDetails(id, updates, user?.id);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
      );
      setAllProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
      );
      showToast('Perubahan karya berhasil disimpan!', 'success');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui karya.', 'error');
      return false;
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setAllProducts((prev) => prev.filter((p) => p.id !== productId));
      await fbDeleteProduct(productId);
      showToast('Karya berhasil dihapus dari marketplace.', 'info');
    } catch (err) {
      console.error('Failed to delete product:', err);
      showToast('Gagal menghapus karya dari Firestore.', 'error');
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>): Promise<boolean> => {
    if (!user) return false;
    try {
      const updated: UserProfile = { ...user, ...data };
      setUser(updated);
      await fbUpdateUserProfile(user.id, data);
      showToast('Profil akun berhasil diperbarui!', 'success');
      return true;
    } catch (err) {
      console.error('Failed to update profile:', err);
      showToast('Gagal memperbarui profil di database.', 'error');
      return false;
    }
  };

  // Order & Payment actions
  const createOrder = async (order: Order) => {
    setOrders((prev) => [order, ...prev]);
    setAllOrders((prev) => [order, ...prev]);
    await fbCreateOrder(order);

    // If free order, immediately grant to purchased gallery using previewImage (never productFile) and record entitlement
    if (order.amount === 0 && order.status === 'paid') {
      const prod = allProducts.find((p) => p.id === order.productId);
      if (prod && user) {
        const purchaseId = `${user.id}_${prod.id}`;
        const newPurchaseRecord: PurchaseRecord = {
          id: purchaseId,
          buyerId: user.id,
          productId: prod.id,
          productName: prod.name,
          creatorId: prod.creatorId,
          orderId: order.id,
          amount: 0,
          licenseType: prod.licenseType || 'Personal Use',
          purchasedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        setPurchases((prev) => {
          if (prev.some((p) => p.id === purchaseId || p.productId === prod.id)) return prev;
          return [newPurchaseRecord, ...prev];
        });

        const item: GalleryItem = {
          id: `purchased-${Date.now()}`,
          userId: user.id,
          productId: prod.id,
          title: prod.name,
          type: 'purchased',
          fileUrl: prod.previewImage || '', // Strictly use previewImage, NEVER productFile
          templateName: prod.name,
          createdAt: new Date().toISOString(),
        };
        await addToGallery(item);
      }
    }
  };

  const updateOrderPayment = async (orderId: string, proofImage: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, proofImage, status: 'waiting_verification' } : o))
    );
    setAllOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, proofImage, status: 'waiting_verification' } : o))
    );

    await fbUploadOrderProof(orderId, proofImage, user?.id);
    showToast('Bukti pembayaran terupload! Menunggu konfirmasi admin.', 'success');
  };

  const verifyOrderPayment = async (orderId: string, status: Order['status'], reason?: string) => {
    try {
      // 1. Execute atomic Firestore transaction first
      await fbVerifyPayment(`PAY-${orderId}`, orderId, status === 'paid' ? 'approved' : 'rejected', reason, user?.id);

      // 2. Only upon successful transaction completion, update reactive states
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status, rejectionReason: reason } : o))
      );
      setAllOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status, rejectionReason: reason } : o))
      );
      setPayments((prev) =>
        prev.map((p) =>
          p.orderId === orderId
            ? { ...p, status: status === 'paid' ? 'approved' : 'rejected', rejectionReason: reason }
            : p
        )
      );

      const targetOrder = allOrders.find((o) => o.id === orderId);
      if (targetOrder) {
        const prod = allProducts.find((p) => p.id === targetOrder.productId);

        if (status === 'paid' && prod) {
          const purchaseId = `${targetOrder.buyerId}_${targetOrder.productId}`;
          const newPurchaseRecord: PurchaseRecord = {
            id: purchaseId,
            buyerId: targetOrder.buyerId,
            productId: targetOrder.productId,
            productName: prod.name,
            creatorId: prod.creatorId,
            orderId: targetOrder.id,
            amount: targetOrder.amount,
            licenseType: 'Personal Use',
            purchasedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };

          // Synchronize reactive purchases list without duplicates
          setPurchases((prev) => {
            if (prev.some((p) => p.id === purchaseId || p.productId === targetOrder.productId)) {
              return prev;
            }
            return [newPurchaseRecord, ...prev];
          });

          // Add item to buyer's gallery representation using safe preview thumbnail
          const purchasedItem: GalleryItem = {
            id: `purchased-${Date.now()}`,
            userId: targetOrder.buyerId,
            productId: prod.id,
            title: prod.name,
            type: 'purchased',
            fileUrl: prod.previewImage || '', // Safe preview image, never protected master path
            templateName: prod.name,
            createdAt: new Date().toISOString(),
          };
          await saveGalleryItem(purchasedItem);
          if (user?.id === targetOrder.buyerId) {
            setGallery((prev) => {
              if (prev.some((g) => g.productId === prod.id)) return prev;
              return [purchasedItem, ...prev];
            });
          }

          // Notify Buyer
          await createNotification({
            id: `notif-${Date.now()}-buyer`,
            userId: targetOrder.buyerId,
            type: 'payment_approved',
            title: 'Pembayaran Disetujui! 🌟',
            message: `Pembayaran untuk "${prod.name}" telah terverifikasi. File resolusi tinggi kini siap diunduh di My Gallery!`,
            read: false,
            linkTab: 'gallery',
            createdAt: new Date().toISOString(),
          });

          // Notify Creator
          await createNotification({
            id: `notif-${Date.now()}-creator`,
            userId: targetOrder.creatorId,
            type: 'order_received',
            title: 'Penjualan Baru! 💰',
            message: `Karyamu "${prod.name}" baru saja terjual senilai Rp ${(targetOrder.creatorEarnings || targetOrder.amount * 0.9).toLocaleString('id-ID')}!`,
            read: false,
            linkTab: 'creator-studio',
            createdAt: new Date().toISOString(),
          });

          showToast('Pembayaran DIVERIFIKASI! Akses unduh dan entitlement telah aktif.', 'success');
        } else {
          // Notify Buyer of rejection
          await createNotification({
            id: `notif-${Date.now()}-reject`,
            userId: targetOrder.buyerId,
            type: 'payment_rejected',
            title: 'Pembayaran Ditolak',
            message: `Bukti pembayaran ditolak: ${reason || 'Bukti pembayaran tidak valid atau dana belum masuk'}.`,
            read: false,
            createdAt: new Date().toISOString(),
          });

          showToast('Pembayaran ditolak oleh admin.', 'error');
        }
      }
    } catch (err: any) {
      console.error('Gagal memverifikasi status pembayaran:', err);
      showToast(err.message || 'Gagal memverifikasi pembayaran. Silakan coba kembali.', 'error');
    }
  };

  // Secure Product File Download (Entitlement verified by backend)
  const downloadProductFile = async (product: Product, orderId?: string): Promise<boolean> => {
    try {
      showToast('Memverifikasi hak akses unduh file original...', 'info');

      // Get Firebase Auth ID token if available
      let idToken: string | null = null;
      if (auth.currentUser) {
        try {
          idToken = await auth.currentUser.getIdToken();
        } catch (tokErr) {
          console.warn('Could not get idToken:', tokErr);
        }
      }

      const headers: Record<string, string> = {};
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const downloadRes = await fetch(`/api/products/${product.id}/download`, {
        headers,
      });

      if (!downloadRes.ok) {
        let errMessage = 'Akses unduh ditolak.';
        try {
          const errJson = await downloadRes.json();
          if (errJson && errJson.error) {
            errMessage = errJson.error;
          }
        } catch {
          // fallback
        }
        showToast(errMessage, 'error');
        return false;
      }

      const blob = await downloadRes.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const safeFilename = `${product.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_HD_Master.png`;

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);

      // Record download history in Firestore
      if (user) {
        const record: DownloadRecord = {
          id: `dl-${Date.now()}`,
          userId: user.id,
          productId: product.id,
          productName: product.name,
          orderId: orderId || 'DIRECT_CLAIM',
          fileUrl: `/api/products/${product.id}/download`,
          downloadedAt: new Date().toISOString(),
        };
        setDownloads((prev) => [record, ...prev]);
        await fbRecordDownload(record);
      }

      showToast('File master resolusi tinggi berhasil diunduh!', 'success');
      return true;
    } catch (err) {
      console.error('Download error:', err);
      showToast('Terjadi gangguan saat mengunduh file original.', 'error');
      return false;
    }
  };

  // Favorites actions
  const isFavorite = (productId: string) => favorites.includes(productId);

  const toggleFav = async (productId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const exists = favorites.includes(productId);
    if (exists) {
      setFavorites((prev) => prev.filter((id) => id !== productId));
      await fbToggleFavorite(user.id, productId, false);
      showToast('Dihapus dari koleksi favorit.', 'info');
    } else {
      setFavorites((prev) => [...prev, productId]);
      await fbToggleFavorite(user.id, productId, true);
      showToast('Ditambahkan ke koleksi favorit!', 'success');
    }
  };

  // Notification actions
  const markNotificationRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await markNotificationAsRead(id);
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await Promise.allSettled(unread.map((n) => markNotificationAsRead(n.id)));
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // Reports
  const submitReport = async (reportData: Omit<ReportItem, 'id' | 'createdAt' | 'status'>) => {
    const newReport: ReportItem = {
      ...reportData,
      id: `rep-${Date.now()}`,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    setReports((prev) => [newReport, ...prev]);
    await fbSubmitReport(newReport);
    showToast('Laporan/masukan kamu berhasil dikirim ke tim K-Click.', 'success');
  };

  const updateReportStatus = async (id: string, status: ReportItem['status']) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
    await fbUpdateReportStatus(id, status);
    showToast(`Status laporan diperbarui ke: ${status}`, 'info');
  };

  // Categories
  const addCategory = async (cat: CategoryItem) => {
    setCategories((prev) => [...prev, cat]);
    await saveCategory(cat);
    showToast(`Kategori "${cat.name}" berhasil ditambahkan.`, 'success');
  };

  const deleteCategory = async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    await fbDeleteCategory(id);
    showToast('Kategori berhasil dihapus.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        mode,
        setMode,
        activeTab,
        setActiveTab,
        searchQuery,
        setSearchQuery,
        products,
        allProducts,
        orders,
        allOrders,
        payments,
        purchases,
        gallery,
        favorites,
        categories,
        notifications,
        unreadNotificationsCount,
        markNotificationRead,
        markAllNotificationsRead,
        reports,
        downloads,
        credits,
        useCredits,
        addCredits,
        isAuthModalOpen,
        setIsAuthModalOpen,
        logout,
        addToGallery,
        removeFromGallery,
        addNewProduct,
        updateProductStatus,
        updateProductDetails,
        deleteProduct,
        updateProfileData,
        createOrder,
        updateOrderPayment,
        verifyOrderPayment,
        downloadProductFile,
        submitReport,
        updateReportStatus,
        addCategory,
        deleteCategory,
        isFavorite,
        toggleFav,
        toggleFavorite: toggleFav,
        toasts,
        showToast,
        selectedProductForDetail,
        setSelectedProductForDetail,
        selectedProductForCheckout,
        setSelectedProductForCheckout,
        isUserProfileModalOpen,
        setIsUserProfileModalOpen,
        selectedCreatorForModal,
        setSelectedCreatorForModal,
        reportProductTarget,
        setReportProductTarget,
        selectedPhotoboothTemplate,
        setSelectedPhotoboothTemplate,
        launchPhotoboothWithTemplate,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
