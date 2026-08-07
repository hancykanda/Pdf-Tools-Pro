'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Eraser,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Info,
  Image as ImageIcon,
  Crown,
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

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function RemoveWatermarkPage() {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [logo, setLogo] = useState<File | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [applyToAll, setApplyToAll] = useState(true);
  const [isPremiumDenied, setIsPremiumDenied] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef<{ x: number; y: number } | null>(null);

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
  } = useToolState<Record<string, unknown>>({
    onReset: () => {
      setMode('auto');
      setLogo(null);
      setBox(null);
      setApplyToAll(true);
      setIsPremiumDenied(false);
      setPreviewReady(false);
    },
  });

  const isImage = !!file && file.type.startsWith('image/');
  const isPdf = !!file && file.type === 'application/pdf';

  // --- First-page preview (canvas) -----------------------------------------
  const renderPreview = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !file) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      if (isImage) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error('Cannot preview image'));
          img.src = url;
        });
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
      } else {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/legacy/build/pdf.worker.mjs',
          import.meta.url,
        ).toString();
        const buf = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, viewport }).promise;
      }
      setPreviewReady(true);
    } catch {
      setError('Could not render a preview of the first page.');
    }
  };

  useEffect(() => {
    if (step === 'options' && mode === 'manual') {
      renderPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, mode]);

  // Redraw box overlay whenever box changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !previewReady) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Re-render base, then draw overlay.
    renderPreview().then(() => {
      if (!box || !canvasRef.current) return;
      const c = canvasRef.current.getContext('2d');
      if (!c) return;
      const px = box.x * canvas.width;
      const py = box.y * canvas.height;
      const pw = box.w * canvas.width;
      const ph = box.h * canvas.height;
      c.strokeStyle = '#ef4444';
      c.lineWidth = 3;
      c.setLineDash([8, 6]);
      c.strokeRect(px, py, pw, ph);
      c.setLineDash([]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box]);

  // --- Canvas box drawing (manual mode) ------------------------------------
  const canvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'manual') return;
    drawing.current = canvasPoint(e);
    setBox({ x: drawing.current.x, y: drawing.current.y, w: 0, h: 0 });
  };
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'manual' || !drawing.current) return;
    const p = canvasPoint(e);
    setBox({
      x: Math.min(drawing.current.x, p.x),
      y: Math.min(drawing.current.y, p.y),
      w: Math.abs(p.x - drawing.current.x),
      h: Math.abs(p.y - drawing.current.y),
    });
  };
  const onMouseUp = () => {
    drawing.current = null;
  };

  // --- Flow handlers -------------------------------------------------------
  const handleFile = (selected: File | null) => {
    if (
      selected &&
      (selected.type === 'application/pdf' ||
        selected.type.startsWith('image/'))
    ) {
      setFile(selected);
      setError(null);
      setSuccess(false);
      setIsPremiumDenied(false);
    } else {
      setError('Please upload a PDF or an image file');
    }
  };

  const handleContinue = () => {
    if (!file) {
      setError('Please select a file to continue');
      return;
    }
    setError(null);
    goToOptions();
  };

  const startCountdown = () => {
    let remaining = 10;
    setCountdown(remaining);
    const timer = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
    return timer;
  };

  const handleProcess = async () => {
    if (!file) return;
    if (mode === 'auto' && !logo) {
      setError('Upload a reference logo image for auto-detection, or switch to manual box mode.');
      return;
    }
    if (mode === 'manual' && (!box || box.w < 0.01 || box.h < 0.01)) {
      setError('Draw a box around the watermark on the preview, or switch to auto mode.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setIsPremiumDenied(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (mode === 'auto' && logo) formData.append('template', logo);
      if (mode === 'manual' && box) formData.append('box', JSON.stringify(box));
      formData.append('applyToAll', String(applyToAll));

      const res = await fetch('/api/tools/remove-watermark', {
        method: 'POST',
        body: formData,
      });

      if (res.status === 403) {
        setIsPremiumDenied(true);
        throw new Error('Premium subscription required to use Remove Watermark.');
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Remove watermark failed');
      }

      const blob = await res.blob();
      setResult(URL.createObjectURL(blob));
      setSuccess(true);
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      if (!isPremiumDenied) {
        setError(err instanceof Error ? err.message : 'Failed to remove watermark');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || countdown > 0) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `${(file?.name || 'document').replace(/\.[^/.]+$/, '')}-clean.${isImage ? 'png' : 'pdf'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ToolPageShell
      title="Remove Watermark"
      description="Strip logos and watermarks from your PDF or image."
      icon={Eraser}
    >
      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={step} />
        <div key={step} className="animate-slide-up">
          {step === 'upload' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="text-center mb-6">
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-2">
                    Upload Your File
                  </h2>
                  <p className="text-sm text-gray-500">
                    PDF or image — we&rsquo;ll remove the watermark or logo
                  </p>
                </div>

                {!file ? (
                  <ToolUploadZone
                    icon={Upload}
                    title="Drop a PDF or image here"
                    subtitle="or click to browse from your computer"
                    accept="application/pdf,image/*"
                    onFiles={(files) => handleFile(files?.[0] || null)}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">{file.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        setError(null);
                      }}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      Remove and select another file
                    </button>
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
                  onClick={handleContinue}
                  disabled={!file}
                  className="min-w-[160px]"
                >
                  Continue to Options
                  <Download className="w-4 h-4" />
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {step === 'options' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-display font-bold text-xl text-brand-dark mb-1">
                      Removal Options
                    </h2>
                    <p className="text-sm text-gray-500">
                      Choose auto-detect or mark the watermark manually
                    </p>
                  </div>
                  <button
                    onClick={() => setStep('upload')}
                    disabled={isProcessing}
                    className="text-xs font-semibold text-gray-500 hover:text-brand-red transition-colors cursor-pointer disabled:opacity-40"
                  >
                    ← Back to Upload
                  </button>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl mb-5">
                  <div className="p-3 bg-white border border-gray-100 rounded-xl text-brand-red">
                    <Eraser className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">{file?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatSize(file?.size || 0)}</p>
                  </div>
                </div>

                {/* Mode toggle */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <button
                    onClick={() => setMode('auto')}
                    className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                      mode === 'auto'
                        ? 'border-brand-red bg-red-50 text-brand-red'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Auto-detect (logo)
                  </button>
                  <button
                    onClick={() => setMode('manual')}
                    className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                      mode === 'manual'
                        ? 'border-brand-red bg-red-50 text-brand-red'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Manual box
                  </button>
                </div>

                {mode === 'auto' ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Upload a clean copy of the logo/watermark. We match it across every page and
                      inpaint the area.
                    </p>
                    {!logo ? (
                      <ToolUploadZone
                        icon={ImageIcon}
                        title="Upload reference logo"
                        subtitle="PNG or JPG of the watermark/logo"
                        accept="image/*"
                        onFiles={(files) => setLogo(files?.[0] || null)}
                      />
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-xl">
                        <span className="text-sm font-semibold text-green-700">{logo.name}</span>
                        <button
                          onClick={() => setLogo(null)}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Draw a box around the watermark on the first-page preview. The same region is
                      applied to every page when &ldquo;Apply to all pages&rdquo; is on.
                    </p>
                    <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                      <canvas
                        ref={canvasRef}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        className="max-w-full mx-auto block cursor-crosshair"
                        style={{ maxHeight: '60vh' }}
                      />
                    </div>
                    {box && (
                      <button
                        onClick={() => setBox(null)}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        Clear box
                      </button>
                    )}
                  </div>
                )}

                <label className="flex items-center gap-3 mt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyToAll}
                    onChange={(e) => setApplyToAll(e.target.checked)}
                    className="w-4 h-4 accent-brand-red"
                  />
                  <span className="text-sm text-gray-700">Apply to all pages</span>
                </label>

                {isPremiumDenied && (
                  <div className="mt-4">
                    <ToolAlert type="error">
                      <Crown className="w-4 h-4 shrink-0" />
                      <span>
                        This is a premium tool. Upgrade your plan to remove watermarks from your
                        documents.
                      </span>
                    </ToolAlert>
                  </div>
                )}
                {error && !isPremiumDenied && (
                  <div className="mt-4">
                    <ToolAlert type="error">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </ToolAlert>
                  </div>
                )}
              </ToolCard>

              <div className="flex justify-end gap-3">
                <ToolSecondaryButton onClick={() => setStep('upload')} disabled={isProcessing}>
                  Back
                </ToolSecondaryButton>
                <ToolPrimaryButton onClick={handleProcess} loading={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Spinner size={24} color="#ffffff" className="shrink-0" />
                      <span>Removing…</span>
                    </>
                  ) : (
                    <>
                      <Eraser className="w-5 h-5 shrink-0" />
                      <span>Remove Watermark</span>
                    </>
                  )}
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {step === 'download' && (
            <div className="space-y-6">
              <ToolCard className="text-center py-12 sm:py-16">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark mb-3">
                  Cleaned File Ready!
                </h2>
                <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                  Your watermark or logo has been removed. Download the result below.
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
                        <span>Download File</span>
                      </>
                    )}
                  </ToolPrimaryButton>
                  <ToolSecondaryButton onClick={resetAll} className="flex-1">
                    <Upload className="w-5 h-5 shrink-0" />
                    <span>Process Another</span>
                  </ToolSecondaryButton>
                </div>
              </ToolCard>

              <RelatedTools currentTool="remove-watermark" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
