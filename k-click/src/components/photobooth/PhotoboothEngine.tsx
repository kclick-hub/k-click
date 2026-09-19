import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { PHOTOBOOTH_TEMPLATES } from '../../data/mockTemplates';
import { PhotoboothTemplate, PhotoCapture, GalleryItem, AspectRatioType } from '../../types';
import { generateTransparentFramePng, getFrameLayout, FrameLayoutInfo, drawRoundRect } from '../../utils/frameGenerator';
import confetti from 'canvas-confetti';
import { 
  Camera, 
  Upload, 
  RefreshCw, 
  Download, 
  Heart, 
  RotateCw, 
  RotateCcw,
  ZoomIn, 
  ZoomOut, 
  ArrowLeft, 
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Move,
  Check, 
  Sliders, 
  Layers, 
  Palette,
  Share2,
  Lock,
  ChevronRight,
  FlipHorizontal,
  Image as ImageIcon,
  Square,
  FileCheck
} from 'lucide-react';

type Step = 'config' | 'camera' | 'editor' | 'decorate' | 'result';

export const PhotoboothEngine: React.FC = () => {
  const { user, addToGallery, showToast, setActiveTab, selectedPhotoboothTemplate, setSelectedPhotoboothTemplate } = useApp();

  // Step state
  const [step, setStep] = useState<Step>('config');

  // Aspect Ratio & Layout
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('strip');
  const [photoCount, setPhotoCount] = useState<number>(4);
  const [selectedTemplate, setSelectedTemplate] = useState<PhotoboothTemplate>(selectedPhotoboothTemplate || PHOTOBOOTH_TEMPLATES[0]);
  const [customFrameUrl, setCustomFrameUrl] = useState<string | null>(null);
  const [generatedFramePng, setGeneratedFramePng] = useState<string | null>(null);

  // Synchronize template if selected from Templates catalog or Home view
  useEffect(() => {
    if (selectedPhotoboothTemplate) {
      setSelectedTemplate(selectedPhotoboothTemplate);
      setCustomBorderColor(selectedPhotoboothTemplate.themeColor);
    }
  }, [selectedPhotoboothTemplate]);

  // Captures
  const [captures, setCaptures] = useState<PhotoCapture[]>([]);
  const [currentCaptureIdx, setCurrentCaptureIdx] = useState<number>(0);

  // Camera handling
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashActive, setIsFlashActive] = useState<boolean>(false);

  // Active editor item & slot placement
  const [activeEditIndex, setActiveEditIndex] = useState<number>(0);
  const [retakingSlotIdx, setRetakingSlotIdx] = useState<number | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [previewWidth, setPreviewWidth] = useState<number>(320);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Measure preview viewport width accurately
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const updateSize = () => {
      if (el.clientWidth > 0) {
        setPreviewWidth(el.clientWidth);
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [step, aspectRatio, photoCount]);

  // Customization & Decoration
  const [customBorderColor, setCustomBorderColor] = useState<string>(selectedTemplate.themeColor);
  const [customCaption, setCustomCaption] = useState<string>('FOREVER MEMORIES • 영원히');
  const [selectedStickers, setSelectedStickers] = useState<string[]>(['💖', '🎀', '📸']);
  const [aiCaptionsLoading, setAiCaptionsLoading] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  
  // Export states
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Update photo count automatically when aspect ratio changes if needed
  const handleAspectRatioChange = (ratio: AspectRatioType) => {
    setAspectRatio(ratio);
    if (ratio === 'strip') {
      setPhotoCount(4);
    } else {
      setPhotoCount(1); // Default single photocard / twibbon
    }
  };

  // Generate transparent frame overlay whenever template, ratio, count, or color changes
  useEffect(() => {
    let isMounted = true;
    if (customFrameUrl) {
      setGeneratedFramePng(customFrameUrl);
      return;
    }

    generateTransparentFramePng(selectedTemplate, aspectRatio, photoCount, customBorderColor)
      .then((dataUrl) => {
        if (isMounted) {
          setGeneratedFramePng(dataUrl);
        }
      })
      .catch((err) => console.error('Frame generation error:', err));

    return () => {
      isMounted = false;
    };
  }, [selectedTemplate, aspectRatio, photoCount, customBorderColor, customFrameUrl]);

  // Initialize camera
  const startCamera = async (facing: 'user' | 'environment' = cameraFacing) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setHasCameraPermission(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setHasCameraPermission(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (step === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [step, cameraFacing]);

  // Flip Camera
  const toggleCameraFacing = () => {
    const next = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(next);
    startCamera(next);
  };

  // Capture Photo with Countdown
  const triggerCountdownAndCapture = () => {
    if (countdown !== null) return;
    let count = 3;
    setCountdown(count);

    const timer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(timer);
        setCountdown(null);
        takeSnapshot();
      }
    }, 900);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth || 1280;
    tempCanvas.height = video.videoHeight || 720;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    // Mirror if front camera
    if (cameraFacing === 'user') {
      ctx.translate(tempCanvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);

    // Flash animation effect
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 200);

    const newCapture: PhotoCapture = {
      id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      rawImage: dataUrl,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      rotation: 0,
      isFlipped: false,
    };

    if (retakingSlotIdx !== null) {
      const slotNum = retakingSlotIdx + 1;
      setCaptures((prev) => {
        const next = [...prev];
        next[retakingSlotIdx] = newCapture;
        return next;
      });
      setRetakingSlotIdx(null);
      showToast(`Foto Slot #${slotNum} berhasil diperbarui!`, 'success');
      setTimeout(() => {
        setStep('editor');
      }, 400);
      return;
    }

    const updated = [...captures, newCapture].slice(0, photoCount);
    setCaptures(updated);

    if (updated.length >= photoCount) {
      setTimeout(() => {
        setStep('editor');
      }, 500);
    } else {
      setCurrentCaptureIdx(updated.length);
    }
  };

  // Upload photo alternative
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = Math.max(0, photoCount - captures.length);
    if (remaining === 0) {
      showToast('Semua slot foto sudah terisi!', 'info');
      return;
    }

    const toProcess = (Array.from(files) as File[]).slice(0, remaining);

    Promise.all(
      toProcess.map((file) => {
        return new Promise<PhotoCapture>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              rawImage: (event.target?.result as string) || '',
              zoom: 1.0,
              panX: 0,
              panY: 0,
              rotation: 0,
              isFlipped: false,
            });
          };
          reader.readAsDataURL(file);
        });
      })
    ).then((newItems) => {
      const validItems = newItems.filter((item) => !!item.rawImage);
      setCaptures((prev) => {
        const next = [...prev, ...validItems].slice(0, photoCount);
        if (next.length >= photoCount) {
          setTimeout(() => setStep('editor'), 300);
        }
        return next;
      });
      showToast(`${validItems.length} foto berhasil diunggah`, 'success');
    });

    e.target.value = '';
  };

  // Replace photo for active slot from file upload
  const handleReplaceActivePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const slotNum = activeEditIndex + 1;
        setCaptures((prev) => {
          const next = [...prev];
          next[activeEditIndex] = {
            id: `replace-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            rawImage: event.target.result as string,
            zoom: 1.0,
            panX: 0,
            panY: 0,
            rotation: 0,
            isFlipped: false,
          };
          return next;
        });
        showToast(`Foto Slot #${slotNum} berhasil diganti!`, 'success');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Retake photo for active slot from camera
  const handleRetakeActiveSlot = () => {
    setRetakingSlotIdx(activeEditIndex);
    setStep('camera');
  };

  // Upload Custom Transparent PNG Frame
  const handleCustomFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCustomFrameUrl(event.target.result as string);
        showToast('Frame transparan PNG kustom berhasil dipasang!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Interactive Editor Manipulations
  const updateCurrentPhoto = (updater: (prev: PhotoCapture) => PhotoCapture) => {
    setCaptures((prev) =>
      prev.map((c, idx) => (idx === activeEditIndex ? updater(c) : c))
    );
  };

  const handleZoomSlider = (newZoom: number) => {
    updateCurrentPhoto((p) => ({
      ...p,
      zoom: Number(newZoom.toFixed(2)),
    }));
  };

  const handleZoomStep = (delta: number) => {
    updateCurrentPhoto((p) => ({
      ...p,
      zoom: Math.min(3.0, Math.max(0.5, Number((p.zoom + delta).toFixed(2)))),
    }));
  };

  const handleRotateStep = (degrees: number) => {
    updateCurrentPhoto((p) => ({
      ...p,
      rotation: (p.rotation + degrees + 360) % 360,
    }));
  };

  const handleNudge = (dx: number, dy: number) => {
    updateCurrentPhoto((p) => ({
      ...p,
      panX: p.panX + dx,
      panY: p.panY + dy,
    }));
  };

  const handleFlipHorizontal = () => {
    updateCurrentPhoto((p) => ({
      ...p,
      isFlipped: !p.isFlipped,
    }));
  };

  const handleResetCurrent = () => {
    updateCurrentPhoto((p) => ({
      ...p,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      rotation: 0,
      isFlipped: false,
    }));
    showToast(`Posisi Slot #${activeEditIndex + 1} telah direset`, 'info');
  };

  // Drag handlers with accurate coordinate scaling
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    const layout = getFrameLayout(aspectRatio, photoCount);
    const scale = previewWidth > 0 ? layout.width / previewWidth : 4;

    updateCurrentPhoto((p) => ({
      ...p,
      panX: Math.round(p.panX + dx * scale),
      panY: Math.round(p.panY + dy * scale),
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch drag handlers with accurate coordinate scaling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });

    const layout = getFrameLayout(aspectRatio, photoCount);
    const scale = previewWidth > 0 ? layout.width / previewWidth : 4;

    updateCurrentPhoto((p) => ({
      ...p,
      panX: Math.round(p.panX + dx * scale),
      panY: Math.round(p.panY + dy * scale),
    }));
  };

  const handleTouchEnd = () => setIsDragging(false);

  // AI Caption Generator
  const fetchAiCaptions = async () => {
    try {
      setAiCaptionsLoading(true);
      const captionRes = await fetch('/api/gemini/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: selectedTemplate.category,
          fandom: selectedTemplate.name,
        }),
      });
      if (captionRes.status === 429) {
        const errorData = await captionRes.json().catch(() => ({}));
        showToast(errorData.message || 'Batas penggunaan Smart Caption tercapai. Harap tunggu sebentar.', 'error');
        return;
      }
      const data = await captionRes.json();
      if (data.captions && data.captions.length > 0) {
        setAiSuggestions(data.captions);
        setCustomCaption(data.captions[0]);
        showToast('Smart Caption estetik berhasil dibuat!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Menggunakan rekomendasi caption bawaan', 'info');
    } finally {
      setAiCaptionsLoading(false);
    }
  };

  // HIGH-RESOLUTION CANVAS COMPOSITE GENERATOR
  // Renders 6 distinct layers:
  // Layer 1: Solid/Gradient Background
  // Layer 2: User Photos (clipped in windows with pan, zoom, rotation, flip)
  // Layer 3: Additional Props / Accents
  // Layer 4: Stickers
  // Layer 5: Frame PNG (Transparent overlay)
  // Layer 6: Text & Metadata
  const generateHighResComposite = useCallback(async () => {
    setIsGenerating(true);
    try {
      const layout: FrameLayoutInfo = getFrameLayout(aspectRatio, photoCount, 1600);
      const canvas = document.createElement('canvas');
      canvas.width = layout.width;
      canvas.height = layout.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Enable maximum image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // LAYER 1: Background
      ctx.fillStyle = customBorderColor || selectedTemplate.themeColor;
      ctx.fillRect(0, 0, layout.width, layout.height);

      // LAYER 2: User Photos in each window
      for (let i = 0; i < layout.windows.length; i++) {
        const win = layout.windows[i];
        const capture = captures[i];
        if (!capture) continue;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = capture.rawImage;
        });

        ctx.save();
        // Clip to window bounds
        ctx.beginPath();
        drawRoundRect(ctx, win.x, win.y, win.width, win.height, win.borderRadius);
        ctx.clip();

        // Direct canvas coordinates - unified with editor preview
        const centerX = win.x + win.width / 2 + capture.panX;
        const centerY = win.y + win.height / 2 + capture.panY;
        ctx.translate(centerX, centerY);

        // Rotation
        ctx.rotate((capture.rotation * Math.PI) / 180);

        // Flip Horizontal if active
        if (capture.isFlipped) {
          ctx.scale(-1, 1);
        }

        // Maintain aspect ratio cover
        const imgAspect = img.width / img.height;
        const winAspect = win.width / win.height;
        let baseW = win.width;
        let baseH = win.height;

        if (imgAspect > winAspect) {
          baseH = win.height;
          baseW = win.height * imgAspect;
        } else {
          baseW = win.width;
          baseH = win.width / imgAspect;
        }

        const drawW = baseW * capture.zoom;
        const drawH = baseH * capture.zoom;

        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      }

      // LAYER 3 & 4: Additional Props & Stickers
      ctx.save();
      ctx.font = '54px sans-serif';
      selectedTemplate.stickers.forEach((st) => {
        const sx = (st.x / 100) * layout.width;
        const sy = (st.y / 100) * layout.height;
        ctx.fillText(st.icon, sx, sy);
      });
      ctx.restore();

      // LAYER 5: Frame PNG Overlay
      if (generatedFramePng) {
        const frameImg = new Image();
        frameImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          frameImg.onload = () => resolve();
          frameImg.src = generatedFramePng;
        });
        ctx.drawImage(frameImg, 0, 0, layout.width, layout.height);
      }

      // LAYER 6: Text, Custom Slogan, & Metadata Stamp
      ctx.save();
      const footerY = layout.height - 180;
      ctx.fillStyle = selectedTemplate.textColor;
      ctx.textAlign = 'center';

      // Slogan
      ctx.font = 'bold 26px "Outfit", sans-serif';
      ctx.fillText(customCaption, layout.width / 2, footerY + 30);

      // Timestamp
      const now = new Date();
      const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} • K-CLICK`;
      ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = selectedTemplate.textColor + 'aa';
      ctx.fillText(dateStr, layout.width / 2, footerY + 65);

      // Stickers row
      const stickersStr = selectedStickers.join('   ');
      ctx.font = '32px sans-serif';
      ctx.fillText(stickersStr, layout.width / 2, footerY + 115);
      ctx.restore();

      // Output based on selected format
      let mimeType = 'image/png';
      let quality = 0.95;
      if (exportFormat === 'jpeg') {
        mimeType = 'image/jpeg';
      } else if (exportFormat === 'webp') {
        mimeType = 'image/webp';
      }

      const resultDataUrl = canvas.toDataURL(mimeType, quality);
      setFinalImageUrl(resultDataUrl);
      setStep('result');

      // Confetti celebration
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#ec4899', '#8b5cf6', '#38bdf8', '#f59e0b'],
        });
      } catch {
        // safe ignore
      }
    } catch (err) {
      console.error('Composite render failed:', err);
      showToast('Gagal merender photobooth high-res', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [aspectRatio, captures, customBorderColor, customCaption, exportFormat, generatedFramePng, photoCount, selectedStickers, selectedTemplate, showToast]);

  // Save to Gallery
  const handleSaveToGallery = () => {
    if (!finalImageUrl) return;

    const newItem: GalleryItem = {
      id: `kclick-${Date.now()}`,
      userId: user?.id || 'guest',
      title: `${selectedTemplate.name} (${aspectRatio.toUpperCase()})`,
      type: 'photobooth',
      fileUrl: finalImageUrl,
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      createdAt: new Date().toISOString(),
      meta: {
        photosCount: photoCount,
        frameColor: customBorderColor,
        caption: customCaption,
      },
    };

    addToGallery(newItem);
  };

  // Direct Download
  const handleDownload = () => {
    if (!finalImageUrl) return;
    const a = document.createElement('a');
    a.href = finalImageUrl;
    a.download = `K-Click-${selectedTemplate.id}-${aspectRatio}-${Date.now()}.${exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Photo strip berhasil didownload (${exportFormat.toUpperCase()} HD)!`, 'success');
  };

  // Compute CSS aspect ratio classes for preview
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '2:3':
        return 'aspect-[2/3] max-w-[340px]';
      case '3:4':
        return 'aspect-[3/4] max-w-[380px]';
      case '4:5':
        return 'aspect-[4/5] max-w-[400px]';
      case '9:16':
        return 'aspect-[9/16] max-w-[300px]';
      case 'strip':
      default:
        return 'aspect-[3/5] max-w-[320px]';
    }
  };

  const currentLayout: FrameLayoutInfo = getFrameLayout(aspectRatio, photoCount);
  const currentCapture = captures[activeEditIndex];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-24 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-pink-700 text-xs font-bold mb-2">
            <Camera className="w-3.5 h-3.5" />
            <span>K-Pop Live Photobooth & Twibbon</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
            Create Your Idol Photocard & Strip
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pilih rasio (Strip, 2:3 Photocard, 3:4, 4:5, 9:16), ambil/upload foto, atur frame Twibbon presisi!
          </p>
        </div>

        {/* Step Navigation Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setStep('config')}
            className={`px-3 py-1.5 rounded-xl transition-colors ${
              step === 'config' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500'
            }`}
          >
            1. Format & Frame
          </button>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <button
            onClick={() => {
              if (captures.length > 0) setStep('camera');
            }}
            className={`px-3 py-1.5 rounded-xl transition-colors ${
              step === 'camera' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500'
            }`}
          >
            2. Foto ({captures.length}/{photoCount})
          </button>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <button
            onClick={() => {
              if (captures.length > 0) setStep('editor');
            }}
            className={`px-3 py-1.5 rounded-xl transition-colors ${
              step === 'editor' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500'
            }`}
          >
            3. Twibbon Editor
          </button>
        </div>
      </div>

      {/* STEP 1: CONFIG (ASPECT RATIO, CUT COUNT & TEMPLATE) */}
      {step === 'config' && (
        <div className="space-y-8">
          
          {/* Aspect Ratio Selector */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Square className="w-5 h-5 text-pink-500" />
              <span>Pilih Rasio & Format Photobooth:</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Pilih ukuran cetak atau media sosial favoritmu. Canvas akan otomatis menyesuaikan proporsi frame.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { id: 'strip', label: 'Photo Strip', ratio: '4-Cut / 3-Cut', desc: 'Life Four Cuts' },
                { id: '2:3', label: 'Photocard 2:3', ratio: '2 : 3', desc: 'Standard K-Pop Card' },
                { id: '3:4', label: 'Portrait 3:4', ratio: '3 : 4', desc: 'Classic Print' },
                { id: '4:5', label: 'Feed 4:5', ratio: '4 : 5', desc: 'Instagram Feed' },
                { id: '9:16', label: 'Story 9:16', ratio: '9 : 16', desc: 'TikTok / Wallpaper' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAspectRatioChange(item.id as AspectRatioType)}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all text-center ${
                    aspectRatio === item.id
                      ? 'border-pink-500 bg-pink-50/50 shadow-sm ring-2 ring-pink-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900">{item.label}</span>
                  <span className="text-[11px] font-mono text-pink-600 font-bold mt-1">{item.ratio}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Number of Photos Selection */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Layers className="w-5 h-5 text-pink-500" />
              <span>Jumlah Slot Foto:</span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {aspectRatio === 'strip' ? (
                <>
                  <button
                    onClick={() => setPhotoCount(4)}
                    className={`px-5 py-3 rounded-2xl border text-xs font-bold transition-all ${
                      photoCount === 4
                        ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    4-Cut Classic Strip
                  </button>
                  <button
                    onClick={() => setPhotoCount(3)}
                    className={`px-5 py-3 rounded-2xl border text-xs font-bold transition-all ${
                      photoCount === 3
                        ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    3-Cut Tall Strip
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setPhotoCount(1)}
                    className={`px-5 py-3 rounded-2xl border text-xs font-bold transition-all ${
                      photoCount === 1
                        ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    1 Foto (Single Twibbon Frame)
                  </button>
                  <button
                    onClick={() => setPhotoCount(2)}
                    className={`px-5 py-3 rounded-2xl border text-xs font-bold transition-all ${
                      photoCount === 2
                        ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    2 Foto (Split Cut)
                  </button>
                  <button
                    onClick={() => setPhotoCount(4)}
                    className={`px-5 py-3 rounded-2xl border text-xs font-bold transition-all ${
                      photoCount === 4
                        ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    4 Foto (Grid 2x2)
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Template & Frame Selection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-600" />
                <span>Pilih Template & Frame K-Pop:</span>
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-pink-600 hover:text-pink-700 cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 border border-pink-200">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Frame PNG Sendiri</span>
                  <input
                    type="file"
                    accept="image/png"
                    onChange={handleCustomFrameUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {PHOTOBOOTH_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate.id === tmpl.id && !customFrameUrl;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      setSelectedTemplate(tmpl);
                      setSelectedPhotoboothTemplate(tmpl);
                      setCustomBorderColor(tmpl.themeColor);
                      setCustomFrameUrl(null);
                    }}
                    className={`group cursor-pointer rounded-2xl p-3 border-2 transition-all flex flex-col items-center text-center relative overflow-hidden ${
                      isSelected
                        ? 'border-pink-500 bg-white shadow-lg shadow-pink-500/10 scale-102'
                        : 'border-slate-200 bg-white hover:border-pink-300 hover:shadow-sm'
                    }`}
                  >
                    {tmpl.isPremium && (
                      <span className="absolute top-2 right-2 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> VIP
                      </span>
                    )}

                    <div
                      className="w-full h-28 rounded-xl flex flex-col items-center justify-center p-2 mb-3 border border-black/5 transition-transform group-hover:scale-102"
                      style={{ backgroundColor: tmpl.themeColor }}
                    >
                      <div className="w-12 h-14 bg-white/90 rounded-md shadow-xs border border-white flex items-center justify-center mb-1">
                        <Camera className="w-4 h-4 text-slate-400" />
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70 backdrop-blur-xs truncate max-w-full"
                        style={{ color: tmpl.textColor }}
                      >
                        {tmpl.bannerText.split('•')[0]}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-900 truncate w-full">{tmpl.name}</div>
                    <div className="text-[10px] text-slate-400">{tmpl.category}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action to Start Camera or Upload */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => {
                setCaptures([]);
                setCurrentCaptureIdx(0);
                setStep('camera');
              }}
              className="w-full sm:w-auto min-w-[240px] flex items-center justify-center gap-2.5 py-4 px-8 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white font-bold text-base shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Camera className="w-5 h-5" />
              <span>Buka Kamera ({photoCount} Foto)</span>
            </button>

            <label className="w-full sm:w-auto min-w-[240px] flex items-center justify-center gap-2.5 py-4 px-8 rounded-2xl bg-white border border-slate-300 text-slate-700 font-bold text-base hover:bg-slate-50 cursor-pointer transition-all active:scale-[0.98] shadow-sm">
              <Upload className="w-5 h-5 text-slate-500" />
              <span>Upload Foto ({photoCount} Foto)</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* STEP 2: CAMERA CAPTURE */}
      {step === 'camera' && (
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 aspect-[4/3] flex items-center justify-center">
            
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {/* Flash on snapshot */}
            {isFlashActive && (
              <div className="absolute inset-0 bg-white z-30 animate-ping duration-150" />
            )}

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-xs">
                <div className="text-8xl md:text-9xl font-black font-display text-white drop-shadow-2xl animate-bounce">
                  {countdown}
                </div>
              </div>
            )}

            {/* Overlay Viewport Guide */}
            <div className="absolute inset-0 pointer-events-none border-16 border-white/20 flex flex-col justify-between p-4">
              <div className="flex items-center justify-between">
                {retakingSlotIdx !== null ? (
                  <span className="px-3 py-1 rounded-full bg-pink-600 text-white font-bold text-xs tracking-wider shadow-sm animate-pulse">
                    AMBIL ULANG FOTO SLOT #{retakingSlotIdx + 1}
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-black/60 text-white font-bold text-xs tracking-wider backdrop-blur-md">
                    FOTO {captures.length + 1} / {photoCount}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full bg-pink-600 text-white font-bold text-xs tracking-wider shadow-sm">
                  {aspectRatio.toUpperCase()} • {selectedTemplate.name}
                </span>
              </div>

              {/* Crosshair guide */}
              <div className="w-16 h-16 border border-dashed border-white/40 rounded-full mx-auto self-center" />

              <div className="text-center">
                <span className="text-xs text-white/90 bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs">
                  {retakingSlotIdx !== null
                    ? `Ambil foto baru untuk menggantikan Slot #${retakingSlotIdx + 1}`
                    : 'Pose & bersiap! • Smile! 😊'}
                </span>
              </div>
            </div>

            {/* Camera error state */}
            {hasCameraPermission === false && (
              <div className="absolute inset-0 bg-slate-900 z-30 flex flex-col items-center justify-center p-6 text-center text-white">
                <Camera className="w-12 h-12 text-rose-500 mb-3" />
                <h3 className="text-lg font-bold mb-1">Akses Kamera Tidak Tersedia</h3>
                <p className="text-sm text-slate-400 max-w-sm mb-4">
                  Izinkan akses kamera di browsermu atau beralih menggunakan fitur upload foto dari galeri.
                </p>
                <label className="py-2.5 px-5 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white font-semibold text-sm cursor-pointer shadow-md">
                  Upload Foto Saja
                  <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>

          {/* Camera Controls Bar */}
          <div className="flex items-center justify-between gap-4 mt-6 px-4">
            {retakingSlotIdx !== null ? (
              <button
                onClick={() => {
                  setRetakingSlotIdx(null);
                  setStep('editor');
                }}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 py-2.5 px-4 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Batal & Kembali ke Editor</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setCaptures([]);
                  setStep('config');
                }}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 py-2.5 px-4 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Ganti Format/Frame</span>
              </button>
            )}

            {/* Shutter Capture Button */}
            <button
              onClick={triggerCountdownAndCapture}
              disabled={countdown !== null}
              className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 p-1.5 shadow-xl shadow-pink-500/30 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center cursor-pointer"
              title="Ambil Foto"
            >
              <div className="w-full h-full rounded-full border-4 border-white flex items-center justify-center bg-white/20">
                <div className="w-8 h-8 rounded-full bg-white shadow-sm" />
              </div>
            </button>

            {/* Flip Camera */}
            <button
              onClick={toggleCameraFacing}
              className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 py-2.5 px-4 rounded-xl hover:bg-slate-100 transition-colors"
              title="Putar Kamera"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Flip Kamera</span>
            </button>
          </div>

          {/* Captured Photos Progress */}
          {captures.length > 0 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              {Array.from({ length: photoCount }).map((_, i) => (
                <div
                  key={i}
                  className={`w-16 h-20 rounded-xl overflow-hidden border-2 bg-slate-100 flex items-center justify-center relative ${
                    captures[i] ? 'border-pink-500 shadow-sm' : 'border-dashed border-slate-300'
                  }`}
                >
                  {captures[i] ? (
                    <img
                      src={captures[i].rawImage}
                      alt={`Captured ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3: TWIBBON IMAGE EDITOR & COMPOSITE DECORATION */}
      {(step === 'editor' || step === 'decorate') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Live Twibbon-Style Interactive Canvas Viewport */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col items-center">
            <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-pink-600" />
                  <span>Twibbon & Photo Placement Editor</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Setiap foto masuk ke slot masing-masing. Klik slot untuk mengatur zoom, geser, atau ganti foto.
                </p>
              </div>

              {/* Slot Selector Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                {Array.from({ length: photoCount }).map((_, idx) => {
                  const isFilled = !!captures[idx];
                  const isActive = activeEditIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveEditIndex(idx)}
                      className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-pink-600 text-white shadow-sm'
                          : 'bg-transparent text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isFilled ? (isActive ? 'bg-white' : 'bg-emerald-500') : 'bg-slate-300'
                        }`}
                      />
                      <span>Slot {idx + 1}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Viewport with Real Transparent PNG Overlay & Precise Slot Geometry */}
            <div
              ref={previewContainerRef}
              className="relative w-full rounded-2xl overflow-hidden border-2 border-slate-300 shadow-xl cursor-grab active:cursor-grabbing select-none flex items-center justify-center mx-auto"
              style={{
                aspectRatio: `${currentLayout.width} / ${currentLayout.height}`,
                maxWidth: aspectRatio === 'strip' ? '280px' : aspectRatio === '9:16' ? '300px' : '380px',
                backgroundColor: customBorderColor || selectedTemplate.themeColor,
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* LAYER 2: Separate, Independent Photo Windows mapped 1:1 to template slots */}
              {currentLayout.windows.map((win, idx) => {
                const capture = captures[idx];
                const isActive = activeEditIndex === idx;
                const scale = previewWidth > 0 ? previewWidth / currentLayout.width : 0.25;

                return (
                  <div
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveEditIndex(idx);
                    }}
                    className={`absolute overflow-hidden cursor-pointer transition-all ${
                      isActive
                        ? 'ring-2 ring-pink-500 ring-offset-1 z-20 shadow-md'
                        : 'hover:ring-2 hover:ring-pink-300/80 z-10'
                    }`}
                    style={{
                      left: `${(win.x / currentLayout.width) * 100}%`,
                      top: `${(win.y / currentLayout.height) * 100}%`,
                      width: `${(win.width / currentLayout.width) * 100}%`,
                      height: `${(win.height / currentLayout.height) * 100}%`,
                      borderRadius: `${Math.max(2, Math.round(win.borderRadius * scale))}px`,
                    }}
                  >
                    {capture ? (
                      <div
                        className="w-full h-full relative overflow-hidden flex items-center justify-center origin-center"
                        style={{
                          transform: `translate(${capture.panX * scale}px, ${capture.panY * scale}px) scale(${capture.zoom}) rotate(${capture.rotation}deg) scaleX(${capture.isFlipped ? -1 : 1})`,
                          transition: isDragging && isActive ? 'none' : 'transform 75ms ease-out',
                        }}
                      >
                        <img
                          src={capture.rawImage}
                          alt={`Foto Slot ${idx + 1}`}
                          draggable={false}
                          className="max-w-none w-full h-full object-cover pointer-events-none select-none"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-black/10 border border-dashed border-white/50 text-slate-500 p-2 text-center select-none">
                        <Camera className="w-4 h-4 opacity-40 mb-1" />
                        <span className="text-[10px] font-bold">Slot #{idx + 1} Kosong</span>
                      </div>
                    )}

                    {/* Active slot indicator badge */}
                    {isActive && (
                      <div className="absolute top-1.5 left-1.5 z-30 pointer-events-none">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-pink-600 text-white shadow-xs">
                          Slot #{idx + 1} Aktif
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* LAYER 5: Frame PNG Overlay sitting on top */}
              {generatedFramePng && (
                <img
                  src={generatedFramePng}
                  alt="Transparent Frame Overlay"
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none z-15 select-none"
                />
              )}

              {/* Slogan banner preview */}
              {customCaption && (
                <div
                  className="absolute bottom-2.5 left-0 right-0 z-20 text-center pointer-events-none px-4"
                  style={{ color: selectedTemplate.textColor }}
                >
                  <span className="text-[10px] md:text-[11px] font-bold tracking-tight bg-black/25 text-white px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                    {customCaption}
                  </span>
                </div>
              )}
            </div>

            {/* Transform Controls Toolbar */}
            <div className="w-full mt-6 space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />
                  <span>Pengaturan Foto: Slot #{activeEditIndex + 1}</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {captures[activeEditIndex] ? '✓ Foto Terpasang' : 'Belum Ada Foto'}
                </span>
              </div>

              {/* Photo Retake / Upload options for active slot */}
              <div className="grid grid-cols-2 gap-2">
                <label className="py-2 px-3 rounded-xl bg-slate-50 hover:bg-pink-50 hover:text-pink-600 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
                  <Upload className="w-3.5 h-3.5 text-pink-500" />
                  <span>Ganti File #{activeEditIndex + 1}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReplaceActivePhoto}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleRetakeActiveSlot}
                  className="py-2 px-3 rounded-xl bg-slate-50 hover:bg-pink-50 hover:text-pink-600 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Camera className="w-3.5 h-3.5 text-pink-500" />
                  <span>Kamera Ulang #{activeEditIndex + 1}</span>
                </button>
              </div>

              {/* Zoom Slider Control */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <ZoomIn className="w-3.5 h-3.5 text-pink-600" />
                    <span>Zoom / Skala:</span>
                  </span>
                  <span className="font-mono text-pink-600 font-bold">
                    {Math.round((currentCapture?.zoom || 1.0) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleZoomStep(-0.1)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.05"
                    value={currentCapture?.zoom || 1.0}
                    onChange={(e) => handleZoomSlider(parseFloat(e.target.value))}
                    className="flex-1 accent-pink-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <button
                    onClick={() => handleZoomStep(0.1)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Directional Nudge Pad & Rotation Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                {/* Arrow Nudge Pad */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col items-center">
                  <span className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1">
                    <Move className="w-3 h-3 text-slate-400" /> Geser Posisi (Nudge)
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 w-28">
                    <div />
                    <button
                      onClick={() => handleNudge(0, -25)}
                      className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-pink-50 hover:text-pink-600 text-slate-700 shadow-xs flex items-center justify-center active:scale-95"
                      title="Nudge Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <div />
                    <button
                      onClick={() => handleNudge(-25, 0)}
                      className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-pink-50 hover:text-pink-600 text-slate-700 shadow-xs flex items-center justify-center active:scale-95"
                      title="Nudge Left"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateCurrentPhoto((p) => ({ ...p, panX: 0, panY: 0 }))}
                      className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-bold flex items-center justify-center"
                      title="Center"
                    >
                      •
                    </button>
                    <button
                      onClick={() => handleNudge(25, 0)}
                      className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-pink-50 hover:text-pink-600 text-slate-700 shadow-xs flex items-center justify-center active:scale-95"
                      title="Nudge Right"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <div />
                    <button
                      onClick={() => handleNudge(0, 25)}
                      className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-pink-50 hover:text-pink-600 text-slate-700 shadow-xs flex items-center justify-center active:scale-95"
                      title="Nudge Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <div />
                  </div>
                </div>

                {/* Rotation & Flip Controls */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1">
                    <RotateCw className="w-3 h-3 text-slate-400" /> Rotasi & Cermin
                  </span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleRotateStep(-90)}
                      className="py-2.5 px-2 rounded-xl bg-white border border-slate-200 hover:bg-pink-50 hover:text-pink-600 text-slate-700 text-xs font-semibold flex flex-col items-center gap-1 shadow-xs active:scale-95 transition-all"
                      title="Putar ke kiri (-90°)"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="text-[10px]">-90°</span>
                    </button>

                    <button
                      onClick={() => handleRotateStep(90)}
                      className="py-2.5 px-2 rounded-xl bg-white border border-slate-200 hover:bg-pink-50 hover:text-pink-600 text-slate-700 text-xs font-semibold flex flex-col items-center gap-1 shadow-xs active:scale-95 transition-all"
                      title="Putar ke kanan (+90°)"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span className="text-[10px]">+90°</span>
                    </button>

                    <button
                      onClick={handleFlipHorizontal}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 shadow-xs active:scale-95 transition-all ${
                        currentCapture?.isFlipped
                          ? 'bg-pink-100 border-pink-400 text-pink-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                      title="Flip Horizontal (Mirror)"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                      <span className="text-[10px]">Mirror</span>
                    </button>
                  </div>

                  <button
                    onClick={handleResetCurrent}
                    className="w-full mt-2 py-2 px-3 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Slot Ini</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Customization, Smart Caption, & Export Options */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Frame Background Color Customizer */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Palette className="w-5 h-5 text-pink-500" />
                <span>Warna Frame Photo Strip:</span>
              </h3>
              <div className="flex items-center gap-2.5 flex-wrap">
                {[
                  { name: 'Sky Pastel', color: '#e0f2fe' },
                  { name: 'Sakura Pink', color: '#fce7f3' },
                  { name: 'Lilac Violet', color: '#f3e8ff' },
                  { name: 'Matcha Mint', color: '#dcfce7' },
                  { name: 'Teddy Cream', color: '#fef3c7' },
                  { name: 'Midnight Noir', color: '#18181b' },
                  { name: 'Pure White', color: '#ffffff' },
                ].map((item) => (
                  <button
                    key={item.color}
                    onClick={() => {
                      setCustomBorderColor(item.color);
                      setCustomFrameUrl(null);
                    }}
                    className={`w-9 h-9 rounded-full border-2 transition-all relative ${
                      customBorderColor === item.color
                        ? 'ring-2 ring-pink-500 scale-110 border-white'
                        : 'border-slate-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: item.color }}
                    title={item.name}
                  >
                    {customBorderColor === item.color && (
                      <Check className={`w-4 h-4 mx-auto ${item.color === '#18181b' ? 'text-white' : 'text-slate-800'}`} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Caption Section */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label className="text-base font-bold text-slate-900">
                    Smart Caption:
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Buat caption secara otomatis untuk fotomu.
                  </p>
                </div>
                <button
                  onClick={fetchAiCaptions}
                  disabled={aiCaptionsLoading}
                  className="px-3.5 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all disabled:opacity-50 shrink-0"
                  title="Buat caption secara otomatis untuk fotomu"
                >
                  <span>{aiCaptionsLoading ? 'Membuat...' : 'Buat Caption'}</span>
                </button>
              </div>

              <input
                type="text"
                value={customCaption}
                onChange={(e) => setCustomCaption(e.target.value)}
                maxLength={45}
                placeholder="Tulis slogan idolamu atau pilih Smart Caption..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />

              {aiSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {aiSuggestions.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => setCustomCaption(sug)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-medium transition-colors truncate max-w-[220px]"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export Format Selector */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-pink-500" />
                <span>Format File Output:</span>
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'png', label: 'PNG', desc: 'Lossless HD' },
                  { id: 'jpeg', label: 'JPEG', desc: 'Foto Tajam' },
                  { id: 'webp', label: 'WebP', desc: 'Ringan & Cepat' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setExportFormat(fmt.id as 'png' | 'jpeg' | 'webp')}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      exportFormat === fmt.id
                        ? 'border-pink-500 bg-pink-50 text-pink-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs">{fmt.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{fmt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Final High-Res Strip Button */}
            <button
              onClick={generateHighResComposite}
              disabled={isGenerating}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-extrabold text-base shadow-xl shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              <span>{isGenerating ? 'Merender High Resolution...' : `Generate Photobooth ${aspectRatio.toUpperCase()}!`}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: FINAL STRIP RESULT & ACTIONS */}
      {step === 'result' && finalImageUrl && (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Photo Strip Live Preview */}
          <div className="md:col-span-6 flex justify-center">
            <div className="relative p-2 rounded-2xl bg-white shadow-2xl border border-slate-200 max-w-[340px] transition-transform hover:scale-102">
              <img
                src={finalImageUrl}
                alt="K-Click Final Strip"
                className="w-full h-auto rounded-xl"
              />
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                ✓
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-6 space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase text-pink-600 tracking-wider">
                Selesai! • Your K-Click is Ready
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900">
                Karya Photobooth Kamu Siap!
              </h2>
              <p className="text-sm text-slate-500">
                Format resolusi tinggi 1600px+ ({exportFormat.toUpperCase()}) telah dirender sempurna melalui layer canvas tanpa kompresi screenshot.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleDownload}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-base shadow-lg shadow-pink-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>Download ({exportFormat.toUpperCase()} Ultra HD)</span>
              </button>

              <button
                onClick={handleSaveToGallery}
                className="w-full py-3.5 px-6 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-sm border border-purple-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Heart className="w-4 h-4 fill-purple-600" />
                <span>Simpan ke My Gallery</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast('Tautan K-Click berhasil disalin!', 'success');
                }}
                className="w-full py-3 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Bagikan ke Komunitas K-Pop</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setStep('editor')}
                className="text-xs font-bold text-pink-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Edit Lagi Posisi Foto</span>
              </button>

              <button
                onClick={() => setActiveTab('gallery')}
                className="text-xs font-bold text-slate-600 hover:underline cursor-pointer"
              >
                Lihat My Gallery →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
