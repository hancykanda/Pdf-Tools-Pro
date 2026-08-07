'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PenTool,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Type as TypeIcon,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useToolState } from '@/hooks/useToolState';
import {
  ToolPageShell,
  ToolCard,
  ToolUploadZone,
  ToolPrimaryButton,
  ToolSecondaryButton,
  ToolAlert,
  StepIndicator,
  RelatedTools,
} from '@/components/layout';
import { Spinner } from '@/components/ui/Spinner';
import { ProcessingModal } from '@/components/layout';
import { renderPdfPages, type RenderedPage } from '@/lib/pdfPreview';
import { fractionRectToPdf } from '@/lib/pdfPlacement';

const DISPLAY_WIDTH = 620;
const MAX_PREVIEW_PAGES = 60;
const MIN_FRACTION = 0.04;

type SignatureMode = 'draw' | 'type' | 'upload';

interface SignatureData {
  dataUrl: string;
  width: number;
  height: number;
}

interface Placement {
  pageIndex: number;
  /** Fractions of the displayed page, origin top-left. */
  x: number;
  y: number;
  width: number;
  height: number;
}

const TYPE_FONTS = [
  { label: 'Signature', css: '"Segoe Script", "Brush Script MT", "Snell Roundhand", cursive' },
  { label: 'Elegant', css: '"Apple Chancery", "URW Chancery L", "Palatino Linotype", cursive' },
  { label: 'Classic', css: 'Georgia, "Times New Roman", serif' },
  { label: 'Modern', css: '"Trebuchet MS", Helvetica, Arial, sans-serif' },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function loadImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
    img.onerror = () => resolve({ width: 1, height: 1 });
    img.src = dataUrl;
  });
}

/* -------------------------------------------------------------------------- */
/* Signature pad                                                               */
/* -------------------------------------------------------------------------- */

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const strokesRef = useRef<Array<Array<{ x: number; y: number }>>>([]);
  const [hasInk, setHasInk] = useState(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokesRef.current) {
      if (stroke.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (const point of stroke.slice(1)) ctx.lineTo(point.x, point.y);
      if (stroke.length === 1) ctx.lineTo(stroke[0].x + 0.1, stroke[0].y + 0.1);
      ctx.stroke();
    }
  }, []);

  /** Exports the ink, cropped to its bounding box with a little padding. */
  const emit = useCallback(() => {
    const strokes = strokesRef.current.flat();
    if (strokes.length === 0) {
      onChange(null);
      return;
    }

    const pad = 12;
    const xs = strokes.map((p) => p.x);
    const ys = strokes.map((p) => p.y);
    const x0 = Math.max(0, Math.min(...xs) - pad);
    const y0 = Math.max(0, Math.min(...ys) - pad);
    const x1 = Math.min(canvasRef.current?.width ?? 0, Math.max(...xs) + pad);
    const y1 = Math.min(canvasRef.current?.height ?? 0, Math.max(...ys) + pad);

    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(x1 - x0));
    out.height = Math.max(1, Math.round(y1 - y0));
    const ctx = out.getContext('2d');
    const source = canvasRef.current;
    if (!ctx || !source) return;

    ctx.drawImage(source, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    onChange(out.toDataURL('image/png'));
  }, [onChange]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleClear = () => {
    strokesRef.current = [];
    setHasInk(false);
    redraw();
    onChange(null);
  };

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl border-2 border-dashed border-gray-200 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={720}
          height={240}
          className="w-full h-[180px] touch-none cursor-crosshair"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drawingRef.current = true;
            strokesRef.current.push([pointFromEvent(event)]);
            setHasInk(true);
            redraw();
          }}
          onPointerMove={(event) => {
            if (!drawingRef.current) return;
            const stroke = strokesRef.current[strokesRef.current.length - 1];
            stroke.push(pointFromEvent(event));
            redraw();
          }}
          onPointerUp={() => {
            if (!drawingRef.current) return;
            drawingRef.current = false;
            emit();
          }}
          onPointerLeave={() => {
            if (!drawingRef.current) return;
            drawingRef.current = false;
            emit();
          }}
        />
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-gray-300 font-medium">Draw your signature here</span>
          </div>
        )}
      </div>
      <button
        onClick={handleClear}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Clear
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function SignPdfPage() {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [mode, setMode] = useState<SignatureMode>('draw');
  const [signature, setSignature] = useState<SignatureData | null>(null);
  const [typedName, setTypedName] = useState('');
  const [typedFont, setTypedFont] = useState(TYPE_FONTS[0].css);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [applyToAll, setApplyToAll] = useState(false);
  const [drag, setDrag] = useState<'move' | 'resize' | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    start: Placement;
    rect: DOMRect;
  } | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  const {
    step,
    setStep,
    file,
    setFile,
    result,
    setResult,
    countdown,
    setCountdown,
    isProcessing,
    setIsProcessing,
    error,
    setError,
    setSuccess,
    goToOptions,
    goToDownload,
    resetAll,
  } = useToolState<Record<string, unknown>>();

  const releaseResult = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  }, []);

  useEffect(() => releaseResult, [releaseResult]);

  const currentPage = pages[pageIndex] ?? null;
  const displayHeight = currentPage ? (DISPLAY_WIDTH * currentPage.height) / currentPage.width : 0;

  /* ---------------- preview ---------------- */

  const loadPreview = useCallback(
    async (selected: File) => {
      setLoadingPreview(true);
      setPages([]);
      try {
        const buffer = await selected.arrayBuffer();
        const { getPdfInfo } = await import('@/lib/pdfPreview');
        const info = await getPdfInfo(buffer);
        const count = Math.min(info.numPages, MAX_PREVIEW_PAGES);
        const rendered = await renderPdfPages(buffer, {
          pages: Array.from({ length: count }, (_, i) => i + 1),
          targetWidth: DISPLAY_WIDTH,
          onPage: (page) => setPages((prev) => [...prev, page]),
        });
        if (rendered.length === 0) setError('Could not render this PDF. Try another file.');
      } catch {
        setError('Could not render this PDF. Try another file.');
      } finally {
        setLoadingPreview(false);
      }
    },
    [setError],
  );

  const handleFile = (selected: FileList | null) => {
    const picked = selected?.[0] || null;
    if (!picked || picked.type !== 'application/pdf') {
      setError('Please upload a valid PDF file');
      return;
    }
    setFile(picked);
    setError(null);
    setSuccess(false);
    setPages([]);
    setPageIndex(0);
    setPlacement(null);
    releaseResult();
    setResult(null);
    void loadPreview(picked);
  };

  /* ---------------- signature sources ---------------- */

  const applySignature = useCallback(
    async (dataUrl: string | null) => {
      if (!dataUrl) {
        setSignature(null);
        setPlacement(null);
        return;
      }

      const size = await loadImageSize(dataUrl);
      setSignature({ dataUrl, ...size });

      // Give a brand new signature a sensible default position.
      setPlacement((prev) => {
        if (prev) return prev;
        const page = pages[pageIndex];
        if (!page) return prev;
        const pageHeightPx = (DISPLAY_WIDTH * page.height) / page.width;
        const width = 0.28;
        const aspect = size.height / size.width;
        const height = clamp((width * DISPLAY_WIDTH * aspect) / (pageHeightPx || 1), MIN_FRACTION, 0.4);
        return { pageIndex, x: 0.62, y: Math.max(0, 0.82 - height), width, height };
      });
    },
    [pages, pageIndex],
  );

  /** Rasterises the typed name so the server always receives one image. */
  const renderTypedSignature = useCallback(
    (name: string, fontCss: string) => {
      if (!name.trim()) {
        void applySignature(null);
        return;
      }

      const fontSize = 96;
      const measure = document.createElement('canvas').getContext('2d');
      if (!measure) return;
      measure.font = `${fontSize}px ${fontCss}`;
      const width = Math.ceil(measure.measureText(name).width) + 40;
      const height = Math.ceil(fontSize * 1.6);

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.font = `${fontSize}px ${fontCss}`;
      ctx.fillStyle = '#111827';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 20, height / 2);

      void applySignature(canvas.toDataURL('image/png'));
    },
    [applySignature],
  );

  const handleSignatureUpload = (files: FileList | null) => {
    const picked = files?.[0];
    if (!picked) return;
    if (!/^image\/(png|jpeg|jpg)$/i.test(picked.type)) {
      setError('Use a PNG or JPG image for the signature');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => void applySignature(String(reader.result));
    reader.onerror = () => setError('Could not read that image');
    reader.readAsDataURL(picked);
  };

  /* ---------------- dragging ---------------- */

  const startDrag = (dragMode: 'move' | 'resize', event: React.PointerEvent) => {
    const container = pageRef.current;
    if (!placement || !container) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = container.getBoundingClientRect();
    dragRef.current = {
      mode: dragMode,
      startX: (event.clientX - rect.left) / rect.width,
      startY: (event.clientY - rect.top) / rect.height,
      start: placement,
      rect,
    };
    setDrag(dragMode);
  };

  useEffect(() => {
    if (!drag) return;

    const onMove = (event: PointerEvent) => {
      const info = dragRef.current;
      if (!info) return;
      const nx = (event.clientX - info.rect.left) / info.rect.width;
      const ny = (event.clientY - info.rect.top) / info.rect.height;
      const start = info.start;

      if (info.mode === 'move') {
        const dx = clamp(nx - info.startX, -start.x, 1 - start.x - start.width);
        const dy = clamp(ny - info.startY, -start.y, 1 - start.y - start.height);
        setPlacement({ ...start, x: start.x + dx, y: start.y + dy });
        return;
      }

      // Resize from the bottom-right corner, keeping the aspect ratio.
      const aspect = start.height / start.width;
      const width = clamp(nx - start.x, MIN_FRACTION, 1 - start.x);
      const height = clamp(width * aspect, MIN_FRACTION, 1 - start.y);
      setPlacement({ ...start, width: height / aspect, height });
    };

    const onUp = () => {
      dragRef.current = null;
      setDrag(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag]);

  /* ---------------- submit ---------------- */

  const placementsForRequest = useMemo(() => {
    if (!placement) return [];
    const targets = applyToAll
      ? pages.map((_, index) => index)
      : [placement.pageIndex];

    return targets
      .map((index) => {
        const page = pages[index];
        if (!page) return null;
        const rect = fractionRectToPdf(
          { x: placement.x, y: placement.y, width: placement.width, height: placement.height },
          page.width,
          page.height,
          page.rotation,
        );
        return { pageIndex: index, rotation: page.rotation, ...rect };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [placement, applyToAll, pages]);

  const handleSign = async () => {
    if (!file) return;
    if (!signature) {
      setError('Draw, type or upload a signature first');
      return;
    }
    if (placementsForRequest.length === 0) {
      setError('Drag the signature onto the page first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append(
        'options',
        JSON.stringify({
          signatureImage: signature.dataUrl,
          placements: placementsForRequest,
        }),
      );

      const res = await fetch('/api/tools/sign-pdf', { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Signing failed');
      }

      const blob = await res.blob();
      releaseResult();
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult(url);
      setSuccess(true);
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const startCountdown = () => {
    let remaining = 5;
    setCountdown(remaining);
    const timer = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
    return timer;
  };

  const handleDownload = () => {
    if (!result || countdown > 0) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `${(file?.name || 'document').replace(/\.pdf$/i, '')}-signed.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    releaseResult();
    setPages([]);
    setPageIndex(0);
    setSignature(null);
    setPlacement(null);
    setTypedName('');
    setApplyToAll(false);
    resetAll();
  };

  const goToPage = (index: number) => {
    const next = clamp(index, 0, Math.max(0, pages.length - 1));
    setPageIndex(next);
    setPlacement((prev) => (prev ? { ...prev, pageIndex: next } : prev));
  };

  return (
    <ToolPageShell
      title="Sign PDF"
      description="Draw, type or upload your signature and drop it exactly where it belongs."
      icon={PenTool}
    >
      <div className="max-w-6xl mx-auto">
        <StepIndicator currentStep={step} labels={{ upload: 'Upload', options: 'Sign', download: 'Download' }} />
        <ProcessingModal open={isProcessing} />
        <div key={step} className="animate-slide-up">
          {step === 'upload' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <ToolCard>
                <div className="text-center mb-6">
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-2">Upload Your PDF</h2>
                  <p className="text-sm text-gray-500">Then place your signature directly on the page</p>
                </div>

                {!file ? (
                  <ToolUploadZone
                    icon={Upload}
                    title="Drop a PDF file here"
                    subtitle="or click to browse from your computer"
                    accept="application/pdf"
                    onFiles={handleFile}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-2xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                        <span className="text-sm font-semibold text-green-700 truncate">{file.name}</span>
                      </div>
                      {pages.length > 0 && (
                        <span className="text-xs text-gray-500 shrink-0">{pages.length} pages</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setFile(null);
                          setPages([]);
                          setError(null);
                        }}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        Remove
                      </button>
                      {loadingPreview && (
                        <span className="flex items-center gap-2 text-xs text-gray-500">
                          <Spinner size={14} /> Rendering pages…
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-4">
                    <ToolAlert type="error">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </ToolAlert>
                  </div>
                )}
              </ToolCard>

              <div className="flex justify-end">
                <ToolPrimaryButton
                  onClick={() => {
                    if (!file) {
                      setError('Please select a PDF file to continue');
                      return;
                    }
                    setError(null);
                    goToOptions();
                  }}
                  disabled={!file || pages.length === 0}
                  className="min-w-[160px]"
                >
                  Continue
                  <PenTool className="w-4 h-4" />
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {step === 'options' && (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
              {/* Page canvas */}
              <ToolCard className="overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-display font-bold text-lg text-brand-dark">Place your signature</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Drag the box, pull the corner to resize</p>
                  </div>
                  <button
                    onClick={() => setStep('upload')}
                    className="text-xs font-semibold text-gray-500 hover:text-brand-red transition-colors cursor-pointer"
                  >
                    ← Back
                  </button>
                </div>

                <div className="flex items-center justify-center gap-3 mb-4">
                  <button
                    onClick={() => goToPage(pageIndex - 1)}
                    disabled={pageIndex === 0}
                    className="p-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold text-gray-600">
                    Page {pageIndex + 1} of {pages.length}
                  </span>
                  <button
                    onClick={() => goToPage(pageIndex + 1)}
                    disabled={pageIndex >= pages.length - 1}
                    className="p-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex justify-center">
                  <div
                    ref={pageRef}
                    className="relative bg-white shadow-sm border border-gray-200 select-none"
                    style={{ width: DISPLAY_WIDTH, height: displayHeight, maxWidth: '100%' }}
                  >
                    {currentPage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={currentPage.dataUrl}
                        alt={`Page ${pageIndex + 1}`}
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Spinner size={24} />
                      </div>
                    )}

                    {signature && placement && (placement.pageIndex === pageIndex || applyToAll) && (
                      <div
                        onPointerDown={(event) => startDrag('move', event)}
                        className={`absolute border-2 border-brand-red/70 bg-brand-red/5 ${
                          drag === 'move' ? 'cursor-grabbing' : 'cursor-grab'
                        }`}
                        style={{
                          left: `${placement.x * 100}%`,
                          top: `${placement.y * 100}%`,
                          width: `${placement.width * 100}%`,
                          height: `${placement.height * 100}%`,
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={signature.dataUrl}
                          alt="Signature"
                          className="w-full h-full object-contain pointer-events-none"
                        />
                        <span
                          onPointerDown={(event) => startDrag('resize', event)}
                          className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-white border-2 border-brand-red rounded-full cursor-nwse-resize"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </ToolCard>

              {/* Signature builder */}
              <div className="space-y-6">
                <ToolCard>
                  <h3 className="font-display font-bold text-base text-brand-dark mb-4">Your signature</h3>

                  <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-xl mb-4">
                    {(
                      [
                        { key: 'draw', label: 'Draw', icon: PenTool },
                        { key: 'type', label: 'Type', icon: TypeIcon },
                        { key: 'upload', label: 'Upload', icon: ImageIcon },
                      ] as Array<{ key: SignatureMode; label: string; icon: typeof PenTool }>
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => {
                          setMode(tab.key);
                          setSignature(null);
                          setPlacement(null);
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          mode === tab.key
                            ? 'bg-white text-brand-dark shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {mode === 'draw' && <SignaturePad onChange={(url) => void applySignature(url)} />}

                  {mode === 'type' && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={typedName}
                        onChange={(e) => {
                          setTypedName(e.target.value);
                          renderTypedSignature(e.target.value, typedFont);
                        }}
                        placeholder="Type your name"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {TYPE_FONTS.map((font) => (
                          <button
                            key={font.label}
                            onClick={() => {
                              setTypedFont(font.css);
                              renderTypedSignature(typedName, font.css);
                            }}
                            style={{ fontFamily: font.css }}
                            className={`px-3 py-2.5 rounded-xl border text-base truncate cursor-pointer transition-all ${
                              typedFont === font.css
                                ? 'border-brand-red bg-red-50/60 text-brand-dark'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {typedName || font.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {mode === 'upload' && (
                    <div>
                      <ToolUploadZone
                        icon={ImageIcon}
                        title="Drop a signature image"
                        subtitle="PNG with transparency works best"
                        accept="image/png,image/jpeg"
                        onFiles={handleSignatureUpload}
                      />
                    </div>
                  )}

                  {signature && (
                    <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={signature.dataUrl} alt="Signature preview" className="h-10 object-contain" />
                      <span className="text-xs text-green-700 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready to place
                      </span>
                    </div>
                  )}
                </ToolCard>

                <ToolCard>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyToAll}
                      onChange={(e) => setApplyToAll(e.target.checked)}
                      className="w-4 h-4 accent-[var(--brand-red,#e5322d)] cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">Sign every page at this position</span>
                  </label>

                  <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl mt-4">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      The signature is stamped into the page content with pdf-lib. This is a visible signature, not a
                      cryptographic certificate.
                    </p>
                  </div>

                  {error && (
                    <div className="mt-4">
                      <ToolAlert type="error">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                      </ToolAlert>
                    </div>
                  )}

                  <div className="mt-4">
                    <ToolPrimaryButton onClick={handleSign} loading={isProcessing} disabled={!signature}>
                      {isProcessing ? (
                        <>
                          <Spinner size={24} color="#ffffff" className="shrink-0" />
                          <span>Signing...</span>
                        </>
                      ) : (
                        <>
                          <PenTool className="w-5 h-5 shrink-0" />
                          <span>Sign PDF</span>
                        </>
                      )}
                    </ToolPrimaryButton>
                  </div>
                </ToolCard>
              </div>
            </div>
          )}

          {step === 'download' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <ToolCard className="text-center py-12 sm:py-16">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark mb-3">
                  PDF Signed Successfully!
                </h2>
                <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                  Your signature was placed on {placementsForRequest.length}{' '}
                  {placementsForRequest.length === 1 ? 'page' : 'pages'}.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
                  <ToolPrimaryButton onClick={handleDownload} disabled={countdown > 0} className="flex-1">
                    {countdown > 0 ? (
                      <>
                        <Spinner size={24} color="#ffffff" className="shrink-0" />
                        <span>Please wait {countdown}s...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5 shrink-0" />
                        <span>Download PDF</span>
                      </>
                    )}
                  </ToolPrimaryButton>
                  <ToolSecondaryButton onClick={handleReset} className="flex-1">
                    <Upload className="w-5 h-5 shrink-0" />
                    <span>Sign Another</span>
                  </ToolSecondaryButton>
                </div>
              </ToolCard>

              <RelatedTools currentTool="sign-pdf" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
