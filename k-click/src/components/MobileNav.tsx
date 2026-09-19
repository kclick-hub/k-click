import React from 'react';
import { useApp } from '../context/AppContext';
import { Home, Camera, ShoppingBag, Image as ImageIcon, User, Palette } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, mode, user, setIsAuthModalOpen } = useApp();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg">
      <button
        onClick={() => setActiveTab('home')}
        className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${
          activeTab === 'home' ? 'text-pink-600 font-bold' : 'text-slate-500'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px]">Home</span>
      </button>

      <button
        onClick={() => setActiveTab('marketplace')}
        className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${
          activeTab === 'marketplace' ? 'text-pink-600 font-bold' : 'text-slate-500'
        }`}
      >
        <ShoppingBag className="w-5 h-5" />
        <span className="text-[10px]">Market</span>
      </button>

      {/* Floating Center Photobooth Action */}
      <button
        onClick={() => setActiveTab('photobooth')}
        className="flex flex-col items-center -mt-6 group"
      >
        <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/35 group-active:scale-95 transition-transform border-4 border-white">
          <Camera className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-bold text-pink-600 mt-0.5">Photo</span>
      </button>

      <button
        onClick={() => setActiveTab('gallery')}
        className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${
          activeTab === 'gallery' ? 'text-pink-600 font-bold' : 'text-slate-500'
        }`}
      >
        <ImageIcon className="w-5 h-5" />
        <span className="text-[10px]">Gallery</span>
      </button>

      <button
        onClick={() => {
          if (!user) {
            setIsAuthModalOpen(true);
          } else if (mode === 'creator') {
            setActiveTab('creator-studio');
          } else {
            setActiveTab('gallery');
          }
        }}
        className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${
          activeTab === 'creator-studio' ? 'text-purple-600 font-bold' : 'text-slate-500'
        }`}
      >
        {mode === 'creator' ? <Palette className="w-5 h-5" /> : <User className="w-5 h-5" />}
        <span className="text-[10px]">{mode === 'creator' ? 'Studio' : 'Profile'}</span>
      </button>
    </nav>
  );
};
