import React from 'react';
import { useApp } from '../../context/AppContext';
import { PHOTOBOOTH_TEMPLATES } from '../../data/mockTemplates';
import { 
  Camera, 
  ShoppingBag, 
  Palette, 
  CheckCircle2, 
  ArrowRight, 
  Star, 
  Layers, 
  ShieldCheck, 
  Download,
  Heart,
  QrCode
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const { setActiveTab, products, setSelectedProductForDetail } = useApp();

  const featuredProducts = products.filter((p) => p.status === 'approved').slice(0, 4);

  return (
    <div className="pb-24 animate-fade-in space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-12 md:py-20 bg-gradient-to-b from-pink-50/70 via-purple-50/40 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-100/80 border border-pink-200 text-pink-700 text-xs font-bold tracking-wide">
                <Camera className="w-3.5 h-3.5 text-pink-600" />
                <span>#1 K-Pop Online Photobooth & Creative Hub</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-display text-slate-900 tracking-tight leading-[1.1]">
                Ciptakan Momen Idol <br />
                <span className="bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 bg-clip-text text-transparent">
                  4-Cut Photostrip & Twibbon
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Abadikan foto selfie estetik ala studio Korea Selatan, gunakan frame twibbon eksklusif, atau jual desain karyamu ke ribuan komunitas fandom di seluruh dunia.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button
                  onClick={() => setActiveTab('photobooth')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 py-4 px-8 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-extrabold text-base shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Camera className="w-5 h-5" />
                  <span>Mulai Photobooth Gratis</span>
                </button>

                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 py-4 px-8 rounded-2xl bg-white border border-slate-300 hover:border-slate-400 text-slate-800 font-bold text-base hover:bg-slate-50 transition-all shadow-xs"
                >
                  <ShoppingBag className="w-5 h-5 text-slate-600" />
                  <span>Jelajahi Marketplace</span>
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-4 text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Kamera Langsung & Upload Foto</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Twibbon Drag & Zoom Real-Time</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Verified Digital Goods & Instant Downloads</span>
                </div>
              </div>
            </div>

            {/* Right Hero Graphic Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative">
                {/* Visual strip cards stacked */}
                <div className="w-64 sm:w-72 p-3 bg-white rounded-3xl shadow-2xl border border-pink-100 rotate-2 hover:rotate-0 transition-transform duration-300">
                  <div className="bg-sky-100 rounded-2xl p-2.5 text-center space-y-2 border border-sky-200">
                    <div className="text-[10px] font-bold text-sky-800 tracking-wider">
                      HARU FILM • K-CLICK EDITION
                    </div>
                    {/* 4 slots preview */}
                    <div className="space-y-1.5">
                      <div className="aspect-[7/5] rounded-lg overflow-hidden shadow-xs border border-white">
                        <img
                          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"
                          alt="Photo 1"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="aspect-[7/5] rounded-lg overflow-hidden shadow-xs border border-white">
                        <img
                          src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400"
                          alt="Photo 2"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="aspect-[7/5] rounded-lg overflow-hidden shadow-xs border border-white">
                        <img
                          src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400"
                          alt="Photo 3"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="aspect-[7/5] rounded-lg overflow-hidden shadow-xs border border-white">
                        <img
                          src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400"
                          alt="Photo 4"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-sky-900 pt-1">
                      FOREVER WITH YOU • 2026.09.05
                    </div>
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -bottom-4 -left-6 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500 text-white flex items-center justify-center font-bold text-xs">
                    HD
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-900">High Resolution Output</div>
                    <div className="text-[10px] text-slate-500">Siap Cetak Strip Asli</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Featured Photobooth Templates */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-pink-600 mb-1">
              Pilihan Tema Viral
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900">
              Template Photobooth K-Pop Terfavorit
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Gunakan langsung di kamera photobooth dengan 1 klik!
            </p>
          </div>

          <button
            onClick={() => setActiveTab('templates')}
            className="flex items-center gap-1.5 text-xs font-bold text-pink-600 hover:text-pink-700 mt-2 md:mt-0"
          >
            <span>Lihat Semua Template</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {PHOTOBOOTH_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => setActiveTab('photobooth')}
              className="group cursor-pointer bg-white rounded-3xl p-3 border border-slate-200 hover:border-pink-300 hover:shadow-lg transition-all flex flex-col items-center text-center"
            >
              <div
                className="w-full h-32 rounded-2xl flex flex-col items-center justify-center p-2 mb-3 border border-black/5 transition-transform group-hover:scale-105"
                style={{ backgroundColor: tmpl.themeColor }}
              >
                <div className="w-12 h-14 bg-white/90 rounded-md shadow-xs border border-white flex items-center justify-center mb-1">
                  <Camera className="w-4 h-4 text-slate-400" />
                </div>
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/80 truncate max-w-full"
                  style={{ color: tmpl.textColor }}
                >
                  {tmpl.category}
                </span>
              </div>

              <div className="font-bold text-xs text-slate-900 truncate w-full">{tmpl.name}</div>
              <span className="text-[10px] text-pink-600 font-semibold mt-1 flex items-center gap-0.5">
                Coba Foto →
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Marketplace Creations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">
              Karya Kreator Komunitas
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900">
              Marketplace Produk Kreatif Fandom
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Frame photobooth, twibbon konser, stiker fandom PNG, dan wallpaper digital idol.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('marketplace')}
            className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 mt-2 md:mt-0"
          >
            <span>Buka Marketplace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {featuredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
            <p className="text-sm font-bold text-slate-800">Belum ada karya digital di marketplace.</p>
            <p className="text-xs text-slate-500 mt-1">Karya yang diunggah dan disetujui akan tampil di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((prod) => (
              <div
                key={prod.id}
                onClick={() => setSelectedProductForDetail(prod)}
                className="group cursor-pointer bg-white rounded-3xl overflow-hidden border border-slate-200 hover:border-pink-300 hover:shadow-xl transition-all flex flex-col justify-between"
              >
                <div className="relative aspect-square overflow-hidden bg-slate-100">
                  <img
                    src={prod.previewImage}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-800 shadow-xs">
                    {prod.category}
                  </span>
                  {prod.price === 0 && (
                    <span className="absolute bottom-3 left-3 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500 text-white shadow-xs">
                      GRATIS
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <div className="text-xs text-slate-400">{prod.creatorName}</div>
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{prod.name}</h4>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{prod.rating}</span>
                    </div>
                    <div className="font-extrabold text-sm text-slate-900 font-display">
                      {prod.price === 0 ? 'FREE' : `Rp ${prod.price.toLocaleString('id-ID')}`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Creator Studio Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-purple-950 to-slate-900 text-white p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-pink-300 text-xs font-bold">
              <Palette className="w-3.5 h-3.5" />
              <span>K-Click Creator Partner</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black font-display tracking-tight text-white">
              Dapatkan Penghasilan dari Karya Desain K-Pop
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Bergabunglah dengan ratusan kreator digital di K-Click. Upload karyamu (template frame, stiker PNG, twibbon), atur harga dalam Rupiah atau gratis, dan dapatkan pembayaran langsung!
            </p>
          </div>

          <button
            onClick={() => setActiveTab('creator-studio')}
            className="z-10 px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-extrabold text-sm shadow-xl shadow-pink-500/25 active:scale-95 transition-all shrink-0"
          >
            Buka Creator Studio Sekarang →
          </button>

          {/* Background glow decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        </div>
      </section>
    </div>
  );
};
