import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductCategory } from '../../types';
import { ProductDetailModal } from './ProductDetailModal';
import { CheckoutModal } from './CheckoutModal';
import { 
  Search, 
  Filter, 
  Star, 
  Heart, 
  ShoppingBag, 
  ArrowUpDown, 
  Palette, 
  Tag,
  Check
} from 'lucide-react';

const CATEGORIES: Array<'All' | ProductCategory> = [
  'All',
  'Photobooth',
  'Frame',
  'Sticker',
  'Illustration',
  'Wallpaper',
  'Printing Design',
];

export const MarketplaceView: React.FC = () => {
  const { 
    products, 
    isFavorite, 
    toggleFav, 
    mode, 
    setActiveTab,
    selectedProductForDetail,
    setSelectedProductForDetail,
    selectedProductForCheckout,
    setSelectedProductForCheckout
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | ProductCategory>('All');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'rating' | 'price_low' | 'price_high'>('popular');

  // Filter approved products for public marketplace
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => p.status === 'approved')
      .filter((p) => {
        if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
        if (priceFilter === 'free' && p.price !== 0) return false;
        if (priceFilter === 'paid' && p.price === 0) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchCreator = p.creatorName.toLowerCase().includes(q);
          const matchTags = p.tags.some((t) => t.toLowerCase().includes(q));
          return matchName || matchCreator || matchTags;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'popular') return b.salesCount - a.salesCount;
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'price_low') return a.price - b.price;
        if (sortBy === 'price_high') return b.price - a.price;
        return 0;
      });
  }, [products, selectedCategory, priceFilter, searchQuery, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 animate-fade-in">
      {/* Hero Header */}
      <div className="relative rounded-3xl p-6 md:p-10 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white shadow-xl overflow-hidden mb-8">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold mb-3">
            <ShoppingBag className="w-3.5 h-3.5 text-pink-200" />
            <span>Digital Creative Marketplace</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold font-display tracking-tight text-white">
            K-Pop Fan Creations & Templates
          </h1>
          <p className="text-sm md:text-base text-pink-100 mt-2">
            Jelajahi karya kreator digital: frame photobooth estetik, twibbon konser, stiker fandom PNG, dan wallpaper idol favoritmu!
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Search & Filter Controls */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari frame, twibbon, stiker, kreator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 shadow-xs"
            />
          </div>

          {/* Quick Filters: Price & Sort */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1">
            <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 text-xs font-semibold shrink-0 shadow-xs">
              <button
                onClick={() => setPriceFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition-colors ${
                  priceFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setPriceFilter('free')}
                className={`px-3 py-1.5 rounded-xl transition-colors ${
                  priceFilter === 'free' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gratis (Free)
              </button>
              <button
                onClick={() => setPriceFilter('paid')}
                className={`px-3 py-1.5 rounded-xl transition-colors ${
                  priceFilter === 'paid' ? 'bg-pink-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Premium (IDR)
              </button>
            </div>

            {/* Sort selector */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-700 shrink-0 shadow-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent focus:outline-none cursor-pointer text-slate-800 font-bold"
              >
                <option value="popular">Paling Populer</option>
                <option value="newest">Terbaru</option>
                <option value="rating">Rating Tertinggi</option>
                <option value="price_low">Harga: Terendah</option>
                <option value="price_high">Harga: Tertinggi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {cat === 'All' ? 'Semua Kategori' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Creator Studio Prompt Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/80 rounded-3xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Punya karya desain K-Pop, template photobooth, atau stiker fanart?
            </h3>
            <p className="text-xs text-slate-500">
              Jual karyamu langsung ke ribuan fans K-Pop di K-Click Creator Studio!
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('creator-studio')}
          className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all shrink-0"
        >
          Buka Creator Studio →
        </button>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Belum Ada Karya Digital</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Marketplace belum memiliki karya digital yang disetujui. Kreator dapat mengunggah karya pertamanya melalui Creator Studio!
          </p>
          <button
            onClick={() => setActiveTab('creator-studio')}
            className="mt-4 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-xs"
          >
            Unggah Karya di Creator Studio →
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Tidak ada karya yang cocok</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau reset filter kategori untuk melihat karya lainnya.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setPriceFilter('all');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const isFav = isFavorite(product.id);
            return (
              <div
                key={product.id}
                className="group bg-white rounded-3xl overflow-hidden border border-slate-200 hover:border-pink-300 hover:shadow-xl hover:shadow-pink-500/5 transition-all flex flex-col"
              >
                {/* Image Preview */}
                <div className="relative aspect-square overflow-hidden bg-slate-100">
                  <img
                    src={product.previewImage}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Category Tag */}
                  <span className="absolute top-3 left-3 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-900 shadow-xs">
                    {product.category}
                  </span>

                  {/* Favorite Heart Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFav(product.id);
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-md shadow-sm text-slate-400 hover:text-rose-500 transition-colors"
                    title="Favorit"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'text-rose-500 fill-rose-500' : ''}`} />
                  </button>

                  {/* Free badge */}
                  {product.price === 0 && (
                    <span className="absolute bottom-3 left-3 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500 text-white shadow-xs">
                      GRATIS
                    </span>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Creator avatar & name */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <img
                        src={product.creatorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'}
                        alt={product.creatorName}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="text-xs text-slate-500 truncate">{product.creatorName}</span>
                    </div>

                    {/* Product Name */}
                    <h3 
                      onClick={() => setSelectedProductForDetail(product)}
                      className="font-bold text-sm text-slate-900 line-clamp-2 hover:text-pink-600 transition-colors cursor-pointer"
                    >
                      {product.name}
                    </h3>
                  </div>

                  {/* Rating & Price Row */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{product.rating}</span>
                      <span className="text-[10px] text-slate-400">({product.salesCount} sold)</span>
                    </div>

                    <div className="text-right">
                      <div className="font-extrabold text-sm text-slate-900 font-display">
                        {product.price === 0 ? 'FREE' : `Rp ${product.price.toLocaleString('id-ID')}`}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => setSelectedProductForDetail(product)}
                    className="w-full mt-3 py-2 px-3 rounded-xl bg-slate-900 hover:bg-pink-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>Lihat Detail</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProductForDetail && (
        <ProductDetailModal
          product={selectedProductForDetail}
          onClose={() => setSelectedProductForDetail(null)}
          onOpenCheckout={(prod) => {
            setSelectedProductForDetail(null);
            setSelectedProductForCheckout(prod);
          }}
        />
      )}

      {/* Checkout Modal */}
      {selectedProductForCheckout && (
        <CheckoutModal
          product={selectedProductForCheckout}
          onClose={() => setSelectedProductForCheckout(null)}
        />
      )}
    </div>
  );
};
