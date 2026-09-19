import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Camera, 
  ShoppingBag, 
  LayoutGrid, 
  Image as ImageIcon, 
  Shield, 
  Palette, 
  Coins, 
  User, 
  LogOut, 
  ChevronDown, 
  Heart,
  HelpCircle,
  Plus,
  Bell,
  Search,
  Check,
  ExternalLink
} from 'lucide-react';
import { HelpFeedbackModal } from './common/HelpFeedbackModal';

export const Navbar: React.FC = () => {
  const { 
    user, 
    mode, 
    setMode, 
    activeTab, 
    setActiveTab, 
    credits, 
    addCredits, 
    setIsAuthModalOpen, 
    setIsUserProfileModalOpen,
    logout,
    gallery,
    allOrders,
    allProducts,
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    searchQuery,
    setSearchQuery
  } = useApp();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery || '');

  const pendingApprovalsCount = allProducts.filter((p) => p.status === 'pending').length;
  const pendingPaymentsCount = allOrders.filter((o) => o.status === 'waiting_verification').length;
  const totalAdminPending = pendingApprovalsCount + pendingPaymentsCount;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    if (activeTab !== 'marketplace') {
      setActiveTab('marketplace');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20 gap-3">
            
            {/* Logo */}
            <div 
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2.5 cursor-pointer group shrink-0"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-pink-500/25 group-hover:scale-105 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-display font-extrabold text-xl md:text-2xl text-slate-900 tracking-tight">
                  <span>K-Click</span>
                </div>
                <div className="hidden sm:block text-[10px] font-semibold tracking-wider text-pink-600 uppercase -mt-1">
                  K-Pop Photobooth & Creative
                </div>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 font-medium text-sm">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-3.5 py-2 rounded-full transition-colors ${
                  activeTab === 'home'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Home
              </button>

              <button
                onClick={() => setActiveTab('photobooth')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all ${
                  activeTab === 'photobooth'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold shadow-sm shadow-pink-500/30'
                    : 'text-pink-700 bg-pink-50 hover:bg-pink-100/80 font-semibold'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Photobooth</span>
                <span className="text-[10px] uppercase font-bold bg-white/30 px-1.5 py-0.5 rounded-full">
                  Live
                </span>
              </button>

              <button
                onClick={() => setActiveTab('marketplace')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-colors ${
                  activeTab === 'marketplace'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Marketplace</span>
              </button>

              <button
                onClick={() => setActiveTab('templates')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-colors ${
                  activeTab === 'templates'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Templates</span>
              </button>

              <button
                onClick={() => setActiveTab('gallery')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-colors ${
                  activeTab === 'gallery'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>My Gallery</span>
                {gallery.length > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full bg-slate-200 text-slate-800">
                    {gallery.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('faq')}
                className={`px-3 py-2 rounded-full transition-colors ${
                  activeTab === 'faq'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                FAQ
              </button>
            </nav>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative max-w-xs w-full">
              <input
                type="text"
                placeholder="Cari frame, idol, stiker..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 focus:outline-none focus:border-pink-500 focus:bg-white text-xs text-slate-800 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            </form>

            {/* Right Side Controls */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              
              {/* One Account Multi-Function Mode Switcher */}
              <div className="hidden sm:flex items-center p-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => {
                    setMode('buyer');
                    if (activeTab === 'creator-studio') setActiveTab('marketplace');
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all ${
                    mode === 'buyer'
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-pink-500" />
                  <span>Buyer</span>
                </button>

                <button
                  onClick={() => {
                    setMode('creator');
                    setActiveTab('creator-studio');
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all ${
                    mode === 'creator'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Creator</span>
                </button>
              </div>

              {/* Credits Pill */}
              <button
                onClick={() => setIsCreditsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-900 text-xs font-bold transition-all shadow-sm active:scale-95"
                title="Lihat & tambah kredit"
              >
                <Coins className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{credits}</span>
                <span className="hidden xl:inline text-amber-700 font-semibold">Credits</span>
              </button>

              {/* Notifications Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative p-2 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Notifikasi Akun"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-pink-500 ring-2 ring-white animate-pulse" />
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-3xl bg-white shadow-2xl border border-slate-200 p-3 z-50 animate-fade-in">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-900">Notifikasi</div>
                      {unreadNotificationsCount > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-[10px] font-bold text-pink-600 hover:text-pink-700"
                        >
                          Tandai Semua Dibaca
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400">
                          Belum ada notifikasi baru
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => markNotificationRead(n.id)}
                            className={`p-2.5 rounded-2xl cursor-pointer transition-colors ${
                              n.read ? 'bg-slate-50 opacity-70' : 'bg-pink-50/60 border border-pink-100'
                            }`}
                          >
                            <div className="text-xs font-bold text-slate-900">{n.title}</div>
                            <div className="text-[11px] text-slate-600 mt-0.5">{n.message}</div>
                            <div className="text-[9px] text-slate-400 mt-1">
                              {new Date(n.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Portal Button (for Admin users) */}
              {user?.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('admin-portal')}
                  className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-bold transition-all ${
                    activeTab === 'admin-portal'
                      ? 'bg-purple-900 text-white border-purple-900 shadow-sm'
                      : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                  }`}
                  title="Panel Kontrol Administrator"
                >
                  <Shield className="w-3.5 h-3.5 text-purple-600" />
                  <span className="hidden sm:inline">Admin</span>
                  {totalAdminPending > 0 && (
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {totalAdminPending}
                    </span>
                  )}
                </button>
              )}

              {/* User Profile / Login */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    <img
                      src={user.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-pink-500/30"
                    />
                    <span className="hidden md:inline text-xs font-semibold text-slate-800 max-w-[90px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-3xl bg-white shadow-2xl border border-slate-200 p-2.5 z-50 text-sm animate-fade-in">
                      <div className="p-3 border-b border-slate-100">
                        <div className="font-bold text-slate-900 truncate">{user.name}</div>
                        <div className="text-xs text-slate-500 truncate">{user.email}</div>
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : user.role === 'creator'
                              ? 'bg-pink-100 text-pink-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}>
                            {user.role}
                          </span>
                          <span className="text-xs text-amber-700 font-semibold">
                            {credits} Credits
                          </span>
                        </div>
                      </div>

                      <div className="py-2 space-y-1">
                        <button
                          onClick={() => {
                            setIsUserProfileModalOpen(true);
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors text-left text-xs font-semibold"
                        >
                          <User className="w-4 h-4 text-pink-500" />
                          <span>Pengaturan Profil Akun</span>
                        </button>

                        <button
                          onClick={() => {
                            const nextMode = mode === 'buyer' ? 'creator' : 'buyer';
                            setMode(nextMode);
                            if (nextMode === 'creator') setActiveTab('creator-studio');
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors text-left text-xs font-semibold"
                        >
                          <span className="flex items-center gap-2">
                            <Palette className="w-4 h-4 text-pink-500" />
                            <span>Beralih ke {mode === 'buyer' ? 'Creator Mode' : 'Buyer Mode'}</span>
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('gallery');
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors text-left text-xs font-semibold"
                        >
                          <ImageIcon className="w-4 h-4 text-purple-500" />
                          <span>My Gallery & Unduhan</span>
                        </button>

                        {mode === 'creator' && (
                          <button
                            onClick={() => {
                              setActiveTab('creator-studio');
                              setIsProfileMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-purple-700 bg-purple-50/80 hover:bg-purple-100 transition-colors text-left text-xs font-bold"
                          >
                            <Palette className="w-4 h-4 text-purple-600" />
                            <span>Creator Studio</span>
                          </button>
                        )}

                        {user.role === 'admin' && (
                          <button
                            onClick={() => {
                              setActiveTab('admin-portal');
                              setIsProfileMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-purple-800 bg-purple-100/70 hover:bg-purple-200 transition-colors text-left text-xs font-bold"
                          >
                            <Shield className="w-4 h-4" />
                            <span>Admin Portal ({totalAdminPending})</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setIsHelpModalOpen(true);
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors text-left text-xs font-semibold"
                        >
                          <HelpCircle className="w-4 h-4 text-sky-500" />
                          <span>Bantuan & Hubungi Admin</span>
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <button
                          onClick={() => {
                            logout();
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium text-xs"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Keluar (Logout)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-sm"
                >
                  Masuk / Akun
                </button>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Credits Top-up Dialog Modal */}
      {isCreditsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-amber-200 text-center relative">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center mb-3">
              <Coins className="w-7 h-7 fill-amber-500" />
            </div>
            <h3 className="text-xl font-bold font-display text-slate-900">
              K-Click Credits
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Gunakan kredit untuk mengakses template premium, kustomisasi twibbon spesial, dan stiker K-Pop eksklusif!
            </p>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 mb-5">
              <div className="text-xs text-amber-700 font-medium">Saldo Kredit Kamu</div>
              <div className="text-3xl font-extrabold text-amber-900 mt-1">{credits} Credits</div>
            </div>

            <div className="space-y-2 mb-4">
              <button
                onClick={() => {
                  addCredits(10);
                  setIsCreditsModalOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Klaim Bonus Harian (+10 Credits)</span>
              </button>
            </div>

            <button
              onClick={() => setIsCreditsModalOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Help & Feedback Modal */}
      <HelpFeedbackModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </>
  );
};
