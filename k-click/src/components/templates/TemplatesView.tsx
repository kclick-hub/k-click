import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PHOTOBOOTH_TEMPLATES } from '../../data/mockTemplates';
import { PhotoboothTemplate } from '../../types';
import { LayoutGrid, Camera, Check, Lock, Palette } from 'lucide-react';

export const TemplatesView: React.FC = () => {
  const { launchPhotoboothWithTemplate } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Aesthetic', 'K-Pop', 'Fandom', 'Minimal', 'Comeback', 'Cute'];

  const filtered = selectedCategory === 'All'
    ? PHOTOBOOTH_TEMPLATES
    : PHOTOBOOTH_TEMPLATES.filter((t) => t.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-bold mb-2">
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Katalog Template Photobooth</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
          Pilihan Frame & Tema Foto K-Pop
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Pilih template kesukaanmu dan langsung coba pose terbaikmu di Live Photobooth!
        </p>

        {/* Categories bar */}
        <div className="flex items-center gap-2 overflow-x-auto pt-6 pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
        {filtered.map((tmpl) => (
          <div
            key={tmpl.id}
            className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-xl hover:border-pink-300 transition-all flex flex-col justify-between group"
          >
            <div>
              {/* Template Mockup Display */}
              <div
                className="w-full h-56 rounded-2xl p-4 flex flex-col items-center justify-between border border-black/5 shadow-inner transition-transform group-hover:scale-[1.02]"
                style={{ backgroundColor: tmpl.themeColor }}
              >
                <div className="text-center">
                  <div
                    className="text-xs font-black tracking-wider uppercase"
                    style={{ color: tmpl.textColor }}
                  >
                    {tmpl.bannerText}
                  </div>
                  <div
                    className="text-[10px] font-medium opacity-80"
                    style={{ color: tmpl.textColor }}
                  >
                    {tmpl.koreanText}
                  </div>
                </div>

                {/* 3 mini slots representation */}
                <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
                  <div className="aspect-[4/3] bg-white/90 rounded-lg shadow-xs border border-white flex items-center justify-center">
                    <Camera className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="aspect-[4/3] bg-white/90 rounded-lg shadow-xs border border-white flex items-center justify-center">
                    <Camera className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="aspect-[4/3] bg-white/90 rounded-lg shadow-xs border border-white flex items-center justify-center">
                    <Camera className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {tmpl.stickers.slice(0, 3).map((stk, i) => (
                    <span key={i} className="text-sm">
                      {stk.icon}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-pink-600 tracking-wider">
                    {tmpl.category}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">{tmpl.name}</h3>
                </div>
                {tmpl.isPremium && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> VIP
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => launchPhotoboothWithTemplate(tmpl)}
              className="mt-5 w-full py-3 px-4 rounded-2xl bg-slate-900 group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:to-rose-600 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Gunakan di Photobooth</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
