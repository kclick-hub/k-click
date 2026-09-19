import { AspectRatioType, PhotoboothTemplate } from '../types';

export interface FrameLayoutInfo {
  width: number;
  height: number;
  windows: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    borderRadius: number;
  }>;
}

/**
 * Calculates dimensions and photo window coordinates based on aspect ratio and photo count
 */
// Helper for safe roundRect drawing across browser engines
export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}

export function getFrameLayout(
  aspectRatio: AspectRatioType,
  photoCount: number,
  baseWidth: number = 1600
): FrameLayoutInfo {
  let width = baseWidth;
  let height = 2400;
  const windows: FrameLayoutInfo['windows'] = [];

  if (aspectRatio === 'strip') {
    // K-Pop 4-cut or 3-cut vertical strip
    width = 1200;
    const photoW = 1040;
    const photoH = 740;
    const padX = (width - photoW) / 2; // 80px
    const headerH = 220;
    const spacing = 50;
    const footerH = 320;
    const count = Math.min(Math.max(photoCount, 1), 6);
    height = headerH + (count * photoH) + ((count - 1) * spacing) + footerH;

    for (let i = 0; i < count; i++) {
      windows.push({
        x: padX,
        y: headerH + i * (photoH + spacing),
        width: photoW,
        height: photoH,
        borderRadius: 24,
      });
    }
  } else if (aspectRatio === '2:3') {
    // Photocard standard 2:3 ratio
    width = 1600;
    height = 2400;
    if (photoCount === 1) {
      // 1 Main Center Photocard
      const margin = 100;
      const topPad = 180;
      const bottomPad = 260;
      windows.push({
        x: margin,
        y: topPad,
        width: width - margin * 2,
        height: height - topPad - bottomPad,
        borderRadius: 36,
      });
    } else if (photoCount === 2) {
      // 2 vertical cuts
      const margin = 100;
      const winW = width - margin * 2;
      const winH = 920;
      const spacing = 60;
      const topPad = 200;
      windows.push(
        { x: margin, y: topPad, width: winW, height: winH, borderRadius: 28 },
        { x: margin, y: topPad + winH + spacing, width: winW, height: winH, borderRadius: 28 }
      );
    } else {
      // 4 grid
      const margin = 80;
      const gap = 40;
      const winW = (width - margin * 2 - gap) / 2;
      const winH = 880;
      const topPad = 220;
      windows.push(
        { x: margin, y: topPad, width: winW, height: winH, borderRadius: 24 },
        { x: margin + winW + gap, y: topPad, width: winW, height: winH, borderRadius: 24 },
        { x: margin, y: topPad + winH + gap, width: winW, height: winH, borderRadius: 24 },
        { x: margin + winW + gap, y: topPad + winH + gap, width: winW, height: winH, borderRadius: 24 }
      );
    }
  } else if (aspectRatio === '3:4') {
    // 3:4 portrait
    width = 1600;
    height = Math.round(width * (4 / 3)); // ~2133
    if (photoCount === 1) {
      const margin = 90;
      const topPad = 160;
      const bottomPad = 240;
      windows.push({
        x: margin,
        y: topPad,
        width: width - margin * 2,
        height: height - topPad - bottomPad,
        borderRadius: 32,
      });
    } else if (photoCount === 2) {
      // 2 vertical cuts
      const margin = 90;
      const spacing = 40;
      const topPad = 160;
      const bottomPad = 240;
      const winW = width - margin * 2;
      const winH = Math.round((height - topPad - bottomPad - spacing) / 2);
      windows.push(
        { x: margin, y: topPad, width: winW, height: winH, borderRadius: 24 },
        { x: margin, y: topPad + winH + spacing, width: winW, height: winH, borderRadius: 24 }
      );
    } else {
      // 4 grid (2x2)
      const margin = 80;
      const gap = 40;
      const winW = (width - margin * 2 - gap) / 2;
      const winH = (height - 380 - gap) / 2;
      const topPad = 160;
      windows.push(
        { x: margin, y: topPad, width: winW, height: winH, borderRadius: 24 },
        { x: margin + winW + gap, y: topPad, width: winW, height: winH, borderRadius: 24 },
        { x: margin, y: topPad + winH + gap, width: winW, height: winH, borderRadius: 24 },
        { x: margin + winW + gap, y: topPad + winH + gap, width: winW, height: winH, borderRadius: 24 }
      );
    }
  } else if (aspectRatio === '4:5') {
    // 4:5 Instagram Feed
    width = 1600;
    height = 2000;
    if (photoCount === 1) {
      const margin = 90;
      const topPad = 140;
      const bottomPad = 220;
      windows.push({
        x: margin,
        y: topPad,
        width: width - margin * 2,
        height: height - topPad - bottomPad,
        borderRadius: 32,
      });
    } else if (photoCount === 2) {
      // 2 vertical cuts
      const margin = 80;
      const spacing = 36;
      const topPad = 140;
      const bottomPad = 220;
      const winW = width - margin * 2;
      const winH = Math.round((height - topPad - bottomPad - spacing) / 2);
      windows.push(
        { x: margin, y: topPad, width: winW, height: winH, borderRadius: 24 },
        { x: margin, y: topPad + winH + spacing, width: winW, height: winH, borderRadius: 24 }
      );
    } else {
      const margin = 70;
      const gap = 36;
      const winW = (width - margin * 2 - gap) / 2;
      const winH = (height - 340 - gap) / 2;
      const topPad = 150;
      windows.push(
        { x: margin, y: topPad, width: winW, height: winH, borderRadius: 24 },
        { x: margin + winW + gap, y: topPad, width: winW, height: winH, borderRadius: 24 },
        { x: margin, y: topPad + winH + gap, width: winW, height: winH, borderRadius: 24 },
        { x: margin + winW + gap, y: topPad + winH + gap, width: winW, height: winH, borderRadius: 24 }
      );
    }
  } else if (aspectRatio === '9:16') {
    // 9:16 Story / Lockscreen Wallpaper
    width = 1440;
    height = 2560;
    if (photoCount === 1) {
      const margin = 80;
      const topPad = 240;
      const bottomPad = 320;
      windows.push({
        x: margin,
        y: topPad,
        width: width - margin * 2,
        height: height - topPad - bottomPad,
        borderRadius: 40,
      });
    } else if (photoCount <= 2) {
      const margin = 80;
      const winW = width - margin * 2;
      const winH = 960;
      const spacing = 60;
      const topPad = 260;
      windows.push(
        { x: margin, y: topPad, width: winW, height: winH, borderRadius: 32 },
        { x: margin, y: topPad + winH + spacing, width: winW, height: winH, borderRadius: 32 }
      );
    } else {
      // 3 or 4 vertical stacked
      const margin = 80;
      const count = Math.min(photoCount, 4);
      const topPad = 220;
      const bottomPad = 280;
      const availH = height - topPad - bottomPad;
      const spacing = 36;
      const winH = Math.round((availH - (count - 1) * spacing) / count);
      for (let i = 0; i < count; i++) {
        windows.push({
          x: margin,
          y: topPad + i * (winH + spacing),
          width: width - margin * 2,
          height: winH,
          borderRadius: 24,
        });
      }
    }
  }

  return { width, height, windows };
}

/**
 * Generates an authentic transparent PNG Frame Overlay
 * The windows where photos sit are punched out to be 100% transparent.
 * Border accents, decorative stickers, headers, barcodes, and motifs are drawn on top.
 */
export async function generateTransparentFramePng(
  template: PhotoboothTemplate,
  aspectRatio: AspectRatioType,
  photoCount: number,
  customColor?: string
): Promise<string> {
  const layout = getFrameLayout(aspectRatio, photoCount);
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const themeColor = customColor || template.themeColor;
  const textColor = template.textColor;
  const accentColor = template.accentColor;

  // 1. Draw solid frame background
  ctx.fillStyle = themeColor;
  ctx.fillRect(0, 0, layout.width, layout.height);

  // 2. Add subtle texture / pattern on the frame border
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let x = 0; x < layout.width; x += 40) {
    for (let y = 0; y < layout.height; y += 40) {
      if ((x + y) % 80 === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();

  // 3. PUNCH OUT transparent windows using 'destination-out'
  // This turns the photo areas into genuine transparent pixels!
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  layout.windows.forEach((win) => {
    ctx.beginPath();
    drawRoundRect(ctx, win.x, win.y, win.width, win.height, win.borderRadius);
    ctx.fill();
  });
  ctx.restore();

  // 4. Draw frame border strokes around each transparent window (polaroid / cut edge)
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  layout.windows.forEach((win, idx) => {
    // Outer highlight rim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    drawRoundRect(ctx, win.x, win.y, win.width, win.height, win.borderRadius);
    ctx.stroke();

    // Inner shadow accent border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    drawRoundRect(ctx, win.x + 4, win.y + 4, win.width - 8, win.height - 8, Math.max(0, win.borderRadius - 2));
    ctx.stroke();

    // Corner decorative markers
    const markerLen = 24;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    // Top-left corner tick
    ctx.beginPath();
    ctx.moveTo(win.x + 12, win.y + 12 + markerLen);
    ctx.lineTo(win.x + 12, win.y + 12);
    ctx.lineTo(win.x + 12 + markerLen, win.y + 12);
    ctx.stroke();

    // Bottom-right corner tick
    ctx.beginPath();
    ctx.moveTo(win.x + win.width - 12 - markerLen, win.y + win.height - 12);
    ctx.lineTo(win.x + win.width - 12, win.y + win.height - 12);
    ctx.lineTo(win.x + win.width - 12, win.y + win.height - 12 - markerLen);
    ctx.stroke();

    // Slot badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    drawRoundRect(ctx, win.x + 16, win.y + 16, 56, 32, 8);
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 18px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`0${idx + 1}`, win.x + 44, win.y + 32);
  });
  ctx.restore();

  // 5. Draw Decorative Header
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = textColor;
  ctx.font = '800 36px "Outfit", sans-serif';
  ctx.fillText(template.bannerText, layout.width / 2, 80);

  ctx.fillStyle = textColor + 'bb';
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(template.koreanText, layout.width / 2, 125);

  // Decorative dots beside banner
  ctx.fillStyle = accentColor;
  ctx.font = '28px sans-serif';
  ctx.fillText('•', layout.width / 2 - 280, 80);
  ctx.fillText('•', layout.width / 2 + 280, 80);
  ctx.restore();

  // 6. Draw Decorative Template-specific Stickers on the Frame
  ctx.save();
  ctx.font = '48px sans-serif';
  template.stickers.forEach((st) => {
    const sx = (st.x / 100) * layout.width;
    const sy = (st.y / 100) * layout.height;
    ctx.fillText(st.icon, sx, sy);
  });
  ctx.restore();

  // 7. Draw Footer Branding, Barcode, & Authentic K-Pop Photobooth Stamp
  ctx.save();
  const footerY = layout.height - 160;

  // Barcode simulation
  const barW = 320;
  const barX = (layout.width - barW) / 2;
  ctx.fillStyle = textColor;
  for (let b = 0; b < barW; b += 6) {
    const w = (b * 7) % 5 === 0 ? 3 : 1.5;
    ctx.fillRect(barX + b, footerY + 40, w, 32);
  }

  // Stamp info
  ctx.font = 'bold 20px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = textColor;
  ctx.fillText('K-CLICK PHOTOBOOTH • SEOUL & GLOBAL', layout.width / 2, footerY + 10);

  ctx.font = '500 16px monospace';
  ctx.fillStyle = textColor + '99';
  ctx.fillText('KC-AUTHENTIC-2026-KR', layout.width / 2, footerY + 95);
  ctx.restore();

  return canvas.toDataURL('image/png');
}
