/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { AuthModal } from './components/AuthModal';
import { NotificationToast } from './components/common/NotificationToast';
import { HomeView } from './components/home/HomeView';
import { PhotoboothEngine } from './components/photobooth/PhotoboothEngine';
import { MarketplaceView } from './components/marketplace/MarketplaceView';
import { TemplatesView } from './components/templates/TemplatesView';
import { CreatorStudio } from './components/creator/CreatorStudio';
import { AdminPortal } from './components/admin/AdminPortal';
import { MyGalleryView } from './components/gallery/MyGalleryView';
import { FaqView } from './components/faq/FaqView';
import { UserProfileModal } from './components/profile/UserProfileModal';
import { CreatorProfileModal } from './components/creator/CreatorProfileModal';
import { ReportProductModal } from './components/marketplace/ReportProductModal';
import { isFirebaseConfigured } from './config/firebaseConfig';
import { Camera, Heart, Shield, AlertTriangle } from 'lucide-react';

const MainContent: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab,
    isUserProfileModalOpen,
    setIsUserProfileModalOpen,
    selectedCreatorForModal,
    setSelectedCreatorForModal,
    reportProductTarget,
    setReportProductTarget,
    setSelectedProductForDetail
  } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-pink-500 selection:text-white">
      {!isFirebaseConfigured && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-center text-xs font-semibold shadow-sm flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
          <span>
            <strong>Firebase configuration is missing.</strong> Please configure the required environment variables in your <code className="bg-amber-600/30 px-1.5 py-0.5 rounded font-mono">.env</code> file (VITE_FIREBASE_*).
          </span>
        </div>
      )}
      <Navbar />

      <main className="flex-1">
        {activeTab === 'home' && <HomeView />}
        {activeTab === 'photobooth' && <PhotoboothEngine />}
        {activeTab === 'marketplace' && <MarketplaceView />}
        {activeTab === 'templates' && <TemplatesView />}
        {activeTab === 'gallery' && <MyGalleryView />}
        {activeTab === 'creator-studio' && <CreatorStudio />}
        {activeTab === 'admin-portal' && <AdminPortal />}
        {activeTab === 'faq' && <FaqView />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-10 pb-24 md:pb-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold font-display text-slate-900 text-lg flex items-center gap-1.5">
                  <span>K-Click</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  K-Pop Photobooth & Creative Marketplace
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500">
              <button onClick={() => setActiveTab('photobooth')} className="hover:text-pink-600 transition-colors">
                Photobooth
              </button>
              <button onClick={() => setActiveTab('marketplace')} className="hover:text-pink-600 transition-colors">
                Marketplace
              </button>
              <button onClick={() => setActiveTab('templates')} className="hover:text-pink-600 transition-colors">
                Templates
              </button>
              <button onClick={() => setActiveTab('creator-studio')} className="hover:text-pink-600 transition-colors">
                Creator Studio
              </button>
              <button onClick={() => setActiveTab('admin-portal')} className="hover:text-purple-600 transition-colors flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
              <button onClick={() => setActiveTab('faq')} className="hover:text-pink-600 transition-colors">
                FAQ
              </button>
            </div>

            <div className="text-xs text-slate-400 text-center md:text-right">
              &copy; {new Date().getFullYear()} K-Click. Crafted for K-Pop Fans & Creators.
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Modals and Navigation */}
      <MobileNav />
      <NotificationToast />
      <AuthModal />

      {isUserProfileModalOpen && (
        <UserProfileModal 
          isOpen={isUserProfileModalOpen} 
          onClose={() => setIsUserProfileModalOpen(false)} 
        />
      )}

      {selectedCreatorForModal && (
        <CreatorProfileModal
          creatorId={selectedCreatorForModal.creatorId}
          creatorName={selectedCreatorForModal.creatorName}
          creatorAvatar={selectedCreatorForModal.creatorAvatar}
          onClose={() => setSelectedCreatorForModal(null)}
          onSelectProduct={(product) => setSelectedProductForDetail(product)}
        />
      )}

      {reportProductTarget && (
        <ReportProductModal
          product={reportProductTarget}
          onClose={() => setReportProductTarget(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
