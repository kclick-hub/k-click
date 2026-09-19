/**
 * PHOTOBOOTH LAYOUT PRESETS
 * 
 * Preset konfigurasi frame dan layout canvas untuk fitur photobooth in-browser.
 * Preview URL hanya untuk tampilan picker frame lokal pada web camera.
 * Preset ini tidak berhubungan dengan master file unduhan marketplace berbayar.
 */
import { PhotoboothTemplate } from '../types';

export const PHOTOBOOTH_TEMPLATES: PhotoboothTemplate[] = [
  {
    id: 'haru-sky',
    name: 'Haru Sky Pastel',
    category: 'Aesthetic',
    themeColor: '#e0f2fe', // sky-100
    accentColor: '#0284c7', // sky-600
    textColor: '#0369a1',
    bannerText: 'K-CLICK • HARU EDITION',
    koreanText: '하루 필름 • 오늘 우리',
    stickers: [
      { icon: '☁️', label: 'Cloud', x: 8, y: 3 },
      { icon: '🎵', label: 'Music', x: 85, y: 3 },
      { icon: '💙', label: 'Heart', x: 12, y: 92 },
      { icon: '🎧', label: 'Headphones', x: 82, y: 92 },
    ],
    previewUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    isPremium: false,
  },
  {
    id: 'sakura-blossom',
    name: 'Sakura Idol Stage',
    category: 'K-Pop',
    themeColor: '#fce7f3', // pink-100
    accentColor: '#db2777', // pink-600
    textColor: '#be185d',
    bannerText: 'MY ULTIMATE BIAS • STAGE MOMENT',
    koreanText: '최애와 함께 • 빛나는 순간',
    stickers: [
      { icon: '🌸', label: 'Blossom', x: 8, y: 3 },
      { icon: '💖', label: 'Heart', x: 85, y: 3 },
      { icon: '🪄', label: 'Lightstick', x: 12, y: 92 },
      { icon: '🎀', label: 'Ribbon', x: 82, y: 92 },
    ],
    previewUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
    isPremium: false,
  },
  {
    id: 'y2k-cyber',
    name: 'Y2K Cyber Violet',
    category: 'Fandom',
    themeColor: '#f3e8ff', // purple-100
    accentColor: '#9333ea', // purple-600
    textColor: '#7e22ce',
    bannerText: 'CYBER IDOL // 2026.09.05',
    koreanText: '디지털 감성 • 네온 라이트',
    stickers: [
      { icon: '👾', label: 'Alien', x: 8, y: 3 },
      { icon: '⚡', label: 'Bolt', x: 85, y: 3 },
      { icon: '💿', label: 'CD', x: 12, y: 92 },
      { icon: '💜', label: 'Purple Heart', x: 82, y: 92 },
    ],
    previewUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80',
    isPremium: true,
  },
  {
    id: 'midnight-noir',
    name: 'Idol Dark Chic',
    category: 'Minimal',
    themeColor: '#18181b', // zinc-900
    accentColor: '#e4e4e7', // zinc-200
    textColor: '#ffffff',
    bannerText: 'BLACK ONYX • EXCLUSIVE CUT',
    koreanText: '블랙 라벨 • 특별한 하루',
    stickers: [
      { icon: '🖤', label: 'Black Heart', x: 8, y: 3 },
      { icon: '🌙', label: 'Moon', x: 85, y: 3 },
      { icon: '🍸', label: 'Glass', x: 12, y: 92 },
      { icon: '♟️', label: 'Chess', x: 82, y: 92 },
    ],
    previewUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    isPremium: false,
  },
  {
    id: 'matcha-mint',
    name: 'Lucky Comeback Clover',
    category: 'Comeback',
    themeColor: '#dcfce7', // green-100
    accentColor: '#16a34a', // green-600
    textColor: '#15803d',
    bannerText: '1ST WIN COMEBACK MEMORIAL',
    koreanText: '컴백 기념 • 행운의 네잎클로버',
    stickers: [
      { icon: '🍀', label: 'Clover', x: 8, y: 3 },
      { icon: '🏆', label: 'Trophy', x: 85, y: 3 },
      { icon: '💚', label: 'Green Heart', x: 12, y: 92 },
      { icon: '🎈', label: 'Balloon', x: 82, y: 92 },
    ],
    previewUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
    isPremium: false,
  },
  {
    id: 'vintage-cafe',
    name: 'Teddy Fandom Cafe',
    category: 'Cute',
    themeColor: '#fef3c7', // amber-100
    accentColor: '#d97706', // amber-600
    textColor: '#b45309',
    bannerText: 'CUP SLEEVE EVENT // CAFE MEMORY',
    koreanText: '생일 컵홀더 투어 • 달콤한 커피',
    stickers: [
      { icon: '🧸', label: 'Teddy', x: 8, y: 3 },
      { icon: '☕', label: 'Coffee', x: 85, y: 3 },
      { icon: '🧁', label: 'Cupcake', x: 12, y: 92 },
      { icon: '💛', label: 'Yellow Heart', x: 82, y: 92 },
    ],
    previewUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&auto=format&fit=crop&q=80',
    isPremium: true,
  },
];
