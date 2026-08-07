'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Crop, Upload, Download, CheckCircle2, AlertCircle, Undo2 } from 'lucide-react';
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

const MIN_SIZE = 0.05;
const DISPLAY_WIDTH = 520;

type DragMode = 'move' | 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const FULL_BOX: Box = { x0: 0, y0: 0, x1: 1, y1: 1 };

const HANDLES: Array<{ mode: DragMode; className: string; cursor: string }> = [
  { mode: 'nw', className: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2', cursor: 'nwse-resize' },
  { mode: 'n', className: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2', cursor: 'ns-resize' },
  { mode: 'ne', className: 'left-full top-0 -translate-x-1/2 -translate-y-1/2', cursor: 'nesw-resize' },
  { mode: 'w', className: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize' },
  { mode: 'e', className: 'left-full top-1/2 -translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize' },
  { mode: 'sw', className: 'left-0 top-full -translate-x-1/2 -translate-y-1/2', cursor: 'nesw-resize' },
  { mode: 's', className: 'left-1/2 top-full -translate-x-1/2 -translate-y-1/2', cursor: 'ns-resize' },
  { mode: 'se', className: 'left-full top-full -translate-x-1/2 -translate-y-1/2', cursor: 'nwse-resize' },
];

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export default function CropPdfPage() {
  const [previewPage, setPreviewPage] = useState<RenderedPage | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [box, setBox] = useState<Box>(FULL_BOX);
  const [applyToAll, setApplyToAll] = useState(true);
  const [dragging, setDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ mode: DragMode; startX: number; startY: number; startBox: Box; rect: DOMRect } | null>(null);
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

  const loadPreview = useCallback(async (selected: File) => {
    setLoadingPreview(true);
    setPreviewPage(null);
    try {
      const buffer = await selected.arrayBuffer();
      const { getPdfInfo } = await import('@/lib/pdfPreview');
      const info = await getPdfInfo(buffer);
      setPageCount(info.numPages);
      const [page] = await renderPdfPages(buffer, { pages: [1], targetWidth: 560 });
      setPreviewPage(page ?? null);
    } catch {
      setError('Could not render this PDF. Try another file.');
    } finally {
      setLoadingPreview(false);
    }
  }, [setError]);

  const handleFile = (selected: FileList | null) => {
    const selectedFile = selected?.[0] || null;
    if (!selectedFile || selectedFile.type !== 'application/pdf') {
      setError('Please upload a valid PDF file');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setSuccess(false);
    setBox(FULL_BOX);
    releaseResult();
    setResult(null);
    void loadPreview(selectedFile);
  };

  const handleContinueToOptions = () => {
    if (!file) {
      setError('Please select a PDF file to continue');
      return;
    }
    setError(null);
    goToOptions();
  };

  /* ---------------- crop box dragging ---------------- */

  const startDrag = (mode: DragMode) => (event: React.PointerEvent) => {
    const container = containerRef.current;
    if (!container) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = container.getBoundingClientRect();
    dragRef.current = {
      mode,
      startX: (event.clientX - rect.left) / rect.width,
      startY: (event.clientY - rect.top) / rect.height,
      startBox: box,
      rect,
    };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;

    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const nx = clamp01((event.clientX - drag.rect.left) / drag.rect.width);
      const ny = clamp01((event.clientY - drag.rect.top) / drag.rect.height);
      const start = drag.startBox;

      setBox(() => {
        if (drag.mode === 'move') {
          const width = start.x1 - start.x0;
          const height = start.y1 - start.y0;
          const dx = Math.min(Math.max(nx - drag.startX, -start.x0), 1 - start.x1);
          const dy = Math.min(Math.max(ny - drag.startY, -start.y0), 1 - start.y1);
          return { x0: start.x0 + dx, y0: start.y0 + dy, x1: start.x0 + dx + width, y1: start.y0 + dy + height };
        }

        const next = { ...start };
        if (drag.mode.includes('n')) next.y0 = Math.min(ny, start.y1 - MIN_SIZE);
        if (drag.mode.includes('s')) next.y1 = Math.max(ny, start.y0 + MIN_SIZE);
        if (drag.mode.includes('w')) next.x0 = Math.min(nx, start.x1 - MIN_SIZE);
        if (drag.mode.includes('e')) next.x1 = Math.max(nx, start.x0 + MIN_SIZE);
        return {
          x0: clamp01(next.x0),
          y0: clamp01(next.y0),
          x1: clamp01(next.x1),
          y1: clamp01(next.y1),
        };
      });
    };

    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging]);

  const isCropped = box.x0 > 0.001 || box.y0 > 0.001 || box.x1 < 0.999 || box.y1 < 0.999;

  const handleProcess = async () => {
    if (!file) return;
    if (!isCropped) {
      setError('Drag the crop handles to choose an area first');
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
          crop: {
            left: box.x0,
            top: box.y0,
            right: 1 - box.x1,
            bottom: 1 - box.y1,
          },
          applyToAll,
          pageIndex: 0,
        })
      );

      const res = await fetch('/api/tools/crop-pdf', { method: 'POST', body: form });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Cropping failed');
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
      setError(err instanceof Error ? err.message : 'Failed to crop PDF');
    } finally {
      setIsProcessing(false);
    }
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

  const handleDownload = () => {
    if (!result || countdown > 0) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = (file?.name || 'document').replace(/\.pdf$/i, '') + '-cropped.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    releaseResult();
    setPreviewPage(null);
    setPageCount(0);
    setBox(FULL_BOX);
    resetAll();
  };

  const displayHeight = previewPage ? (DISPLAY_WIDTH * previewPage.height) / previewPage.width : 0;
  const cropWidthPt = previewPage ? (box.x1 - box.x0) * previewPage.width : 0;
  const cropHeightPt = previewPage ? (box.y1 - box.y0) * previewPage.height : 0;

  return (
    <ToolPageShell title="Crop PDF" description="Crop margins and adjust page boundaries in PDFs." icon={Crop}>
      <div className="max-w-5xl mx-auto">
        <StepIndicator currentStep={step} labels={{ upload: 'Upload', options: 'Crop', download: 'Download' }} />
        <ProcessingModal open={isProcessing} />
        <div key={step} className="animate-slide-up">
          {step === 'upload' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <ToolCard>
                <div className="text-center mb-6">
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-2">Upload Your PDF</h2>
                  <p className="text-sm text-gray-500">Then drag the crop box directly on the page</p>
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
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">{file.name}</span>
                      </div>
                      {pageCount > 0 && <span className="text-xs text-gray-500">{pageCount} pages</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setFile(null);
                          setPreviewPage(null);
                          setPageCount(0);
                          setError(null);
                        }}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        Remove
                      </button>
                      {loadingPreview && (
                        <span className="flex items-center gap-2 text-xs text-gray-500">
                          <Spinner size={14} /> Rendering page…
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
                <ToolPrimaryButton onClick={handleContinueToOptions} disabled={!file} className="min-w-[160px]">
                  Continue
                  <Crop className="w-4 h-4" />
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {step === 'options' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div>
                    <h2 className="font-display font-bold text-xl text-brand-dark mb-1">Select the crop area</h2>
                    <p className="text-sm text-gray-500">Drag the handles or move the box on the first page.</p>
                  </div>
                  <button
                    onClick={() => setStep('upload')}
                    className="text-xs font-semibold text-gray-500 hover:text-brand-red transition-colors cursor-pointer"
                  >
                    ← Back to Upload
                  </button>
                </div>

                {loadingPreview && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Spinner size={36} />
                    <p className="text-sm text-gray-500">Rendering the first page…</p>
                  </div>
                )}

                {!loadingPreview && previewPage && (
                  <div className="flex flex-col lg:flex-row gap-8 items-start">
                    <div
                      ref={containerRef}
                      className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white select-none mx-auto"
                      style={{ width: DISPLAY_WIDTH, height: displayHeight, touchAction: 'none' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewPage.dataUrl}
                        alt="Page 1"
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        draggable={false}
                      />

                      <div
                        onPointerDown={startDrag('move')}
                        className="absolute border-2 border-brand-red cursor-move"
                        style={{
                          left: `${box.x0 * 100}%`,
                          top: `${box.y0 * 100}%`,
                          width: `${(box.x1 - box.x0) * 100}%`,
                          height: `${(box.y1 - box.y0) * 100}%`,
                          boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)',
                        }}
                      >
                        {HANDLES.map((handle) => (
                          <div
                            key={handle.mode}
                            onPointerDown={startDrag(handle.mode)}
                            className={`absolute w-3.5 h-3.5 bg-white border-2 border-brand-red rounded-sm ${handle.className}`}
                            style={{ cursor: handle.cursor }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 space-y-5 w-full">
                      <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Original size</span>
                          <span className="font-semibold text-brand-dark">
                            {Math.round(previewPage.width)} × {Math.round(previewPage.height)} pt
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Cropped size</span>
                          <span className="font-semibold text-brand-dark">
                            {Math.round(cropWidthPt)} × {Math.round(cropHeightPt)} pt
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Removed</span>
                          <span className="font-semibold text-brand-dark">
                            {Math.round((1 - (box.x1 - box.x0) * (box.y1 - box.y0)) * 100)}% of the page
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                        <div className="p-3 bg-white border border-gray-100 rounded-xl">
                          Left margin
                          <div className="text-brand-dark font-semibold text-sm">
                            {Math.round(box.x0 * previewPage.width)} pt
                          </div>
                        </div>
                        <div className="p-3 bg-white border border-gray-100 rounded-xl">
                          Top margin
                          <div className="text-brand-dark font-semibold text-sm">
                            {Math.round(box.y0 * previewPage.height)} pt
                          </div>
                        </div>
                        <div className="p-3 bg-white border border-gray-100 rounded-xl">
                          Right margin
                          <div className="text-brand-dark font-semibold text-sm">
                            {Math.round((1 - box.x1) * previewPage.width)} pt
                          </div>
                        </div>
                        <div className="p-3 bg-white border border-gray-100 rounded-xl">
                          Bottom margin
                          <div className="text-brand-dark font-semibold text-sm">
                            {Math.round((1 - box.y1) * previewPage.height)} pt
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <ToolSecondaryButton onClick={() => setBox(FULL_BOX)} disabled={!isCropped} className="!py-2 !px-4 text-sm">
                          <Undo2 className="w-4 h-4" /> Reset box
                        </ToolSecondaryButton>
                        <ToolSecondaryButton
                          onClick={() => setBox({ x0: 0.05, y0: 0.05, x1: 0.95, y1: 0.95 })}
                          className="!py-2 !px-4 text-sm"
                        >
                          Trim 5% margins
                        </ToolSecondaryButton>
                      </div>

                      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={applyToAll}
                          onChange={(e) => setApplyToAll(e.target.checked)}
                          className="w-4 h-4 accent-red-600 cursor-pointer"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          Apply to all pages{pageCount > 1 ? ` (${pageCount})` : ''}
                        </span>
                      </label>

                      {!applyToAll && (
                        <p className="text-xs text-gray-500">Only the first page will be cropped.</p>
                      )}
                    </div>
                  </div>
                )}

                {!loadingPreview && !previewPage && (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                    <p className="text-sm text-gray-500">
                      The page preview could not be rendered, so the crop area cannot be selected.
                    </p>
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

              <div className="flex justify-end gap-3">
                <ToolSecondaryButton onClick={() => setStep('upload')}>Back</ToolSecondaryButton>
                <ToolPrimaryButton onClick={handleProcess} loading={isProcessing} disabled={!isCropped} className="!w-auto">
                  {isProcessing ? (
                    <>
                      <Spinner size={20} color="#ffffff" className="shrink-0" />
                      <span>Cropping…</span>
                    </>
                  ) : (
                    <>
                      <Crop className="w-5 h-5 shrink-0" />
                      <span>Crop PDF</span>
                    </>
                  )}
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {step === 'download' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <ToolCard className="text-center py-12 sm:py-16">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark mb-3">PDF Cropped Successfully!</h2>
                <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                  Your cropped PDF is ready for download.
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
                    <span>Crop Another</span>
                  </ToolSecondaryButton>
                </div>
              </ToolCard>
              <RelatedTools currentTool="crop-pdf" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
