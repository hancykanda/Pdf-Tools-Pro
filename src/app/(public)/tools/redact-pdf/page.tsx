'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Shield,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Undo2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
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
/** Ignore accidental clicks — a box must cover a visible area. */
const MIN_FRACTION = 0.008;

interface RedactionBox {
  id: string;
  pageIndex: number;
  /** Fractions of the displayed page, origin top-left. */
  x: number;
  y: number;
  width: number;
  height: number;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export default function RedactPdfPage() {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [boxes, setBoxes] = useState<RedactionBox[]>([]);
  const [draft, setDraft] = useState<RedactionBox | null>(null);
  const [stats, setStats] = useState<{ glyphs: number; images: number; annotations: number } | null>(
    null,
  );

  const pageRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<{ startX: number; startY: number; rect: DOMRect } | null>(null);
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
  const pageBoxes = useMemo(() => boxes.filter((b) => b.pageIndex === pageIndex), [boxes, pageIndex]);

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
    setBoxes([]);
    setPages([]);
    setPageIndex(0);
    setStats(null);
    releaseResult();
    setResult(null);
    void loadPreview(picked);
  };

  /* ---------------- drawing boxes ---------------- */

  const handlePointerDown = (event: React.PointerEvent) => {
    const container = pageRef.current;
    if (!container || !currentPage) return;
    event.preventDefault();
    const rect = container.getBoundingClientRect();
    const startX = clamp01((event.clientX - rect.left) / rect.width);
    const startY = clamp01((event.clientY - rect.top) / rect.height);
    drawRef.current = { startX, startY, rect };
    setDraft({
      id: `draft-${Date.now()}`,
      pageIndex,
      x: startX,
      y: startY,
      width: 0,
      height: 0,
    });
  };

  useEffect(() => {
    if (!draft) return;

    const onMove = (event: PointerEvent) => {
      const info = drawRef.current;
      if (!info) return;
      const nx = clamp01((event.clientX - info.rect.left) / info.rect.width);
      const ny = clamp01((event.clientY - info.rect.top) / info.rect.height);
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              x: Math.min(info.startX, nx),
              y: Math.min(info.startY, ny),
              width: Math.abs(nx - info.startX),
              height: Math.abs(ny - info.startY),
            }
          : prev,
      );
    };

    const onUp = () => {
      drawRef.current = null;
      setDraft((prev) => {
        if (prev && prev.width > MIN_FRACTION && prev.height > MIN_FRACTION) {
          setBoxes((list) => [...list, { ...prev, id: `box-${Date.now()}-${list.length}` }]);
        }
        return null;
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [draft]);

  /* ---------------- submit ---------------- */

  const handleRedact = async () => {
    if (!file) return;
    if (boxes.length === 0) {
      setError('Draw at least one black box over the content you want removed');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const rects = boxes
        .map((box) => {
          const page = pages[box.pageIndex];
          if (!page) return null;
          const rect = fractionRectToPdf(
            { x: box.x, y: box.y, width: box.width, height: box.height },
            page.width,
            page.height,
            page.rotation,
          );
          return { pageIndex: box.pageIndex, ...rect };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

      const form = new FormData();
      form.append('file', file);
      form.append('options', JSON.stringify({ rects }));

      const res = await fetch('/api/tools/redact-pdf', { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Redaction failed');
      }

      setStats({
        glyphs: Number(res.headers.get('X-Tool-glyphsRemoved') ?? 0),
        images: Number(res.headers.get('X-Tool-imagesRemoved') ?? 0),
        annotations: Number(res.headers.get('X-Tool-annotationsRemoved') ?? 0),
      });

      const blob = await res.blob();
      releaseResult();
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult(url);
      setSuccess(true);
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to redact PDF');
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
    link.download = `${(file?.name || 'document').replace(/\.pdf$/i, '')}-redacted.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    releaseResult();
    setPages([]);
    setBoxes([]);
    setPageIndex(0);
    setStats(null);
    resetAll();
  };

  const goToPage = (index: number) => {
    setPageIndex(Math.min(Math.max(index, 0), Math.max(0, pages.length - 1)));
  };

  return (
    <ToolPageShell
      title="Redact PDF"
      description="Draw black boxes over sensitive content — the text underneath is deleted, not just hidden."
      icon={Shield}
    >
      <div className="max-w-6xl mx-auto">
        <StepIndicator currentStep={step} labels={{ upload: 'Upload', options: 'Redact', download: 'Download' }} />
        <ProcessingModal open={isProcessing} />
        <div key={step} className="animate-slide-up">
          {step === 'upload' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <ToolCard>
                <div className="text-center mb-6">
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-2">Upload Your PDF</h2>
                  <p className="text-sm text-gray-500">Then draw boxes over anything that must disappear</p>
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
                  <Shield className="w-4 h-4" />
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {step === 'options' && (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-6 items-start">
              <ToolCard className="overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-display font-bold text-lg text-brand-dark">Draw redaction boxes</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Click and drag over the content to remove</p>
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
                    onPointerDown={handlePointerDown}
                    className="relative bg-white shadow-sm border border-gray-200 select-none touch-none cursor-crosshair"
                    style={{ width: DISPLAY_WIDTH, height: displayHeight, maxWidth: '100%' }}
                  >
                    {currentPage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={currentPage.dataUrl}
                        alt={`Page ${pageIndex + 1}`}
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        draggable={false}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Spinner size={24} />
                      </div>
                    )}

                    {pageBoxes.map((box) => (
                      <div
                        key={box.id}
                        className="absolute bg-black group"
                        style={{
                          left: `${box.x * 100}%`,
                          top: `${box.y * 100}%`,
                          width: `${box.width * 100}%`,
                          height: `${box.height * 100}%`,
                        }}
                      >
                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => setBoxes((list) => list.filter((b) => b.id !== box.id))}
                          className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-500 hover:text-red-600 hover:border-red-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          aria-label="Remove box"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {draft && draft.pageIndex === pageIndex && (
                      <div
                        className="absolute bg-black/70 border border-white/40 pointer-events-none"
                        style={{
                          left: `${draft.x * 100}%`,
                          top: `${draft.y * 100}%`,
                          width: `${draft.width * 100}%`,
                          height: `${draft.height * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              </ToolCard>

              <div className="space-y-6">
                <ToolCard>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold text-base text-brand-dark">
                      Boxes ({boxes.length})
                    </h3>
                    {boxes.length > 0 && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setBoxes((list) => list.slice(0, -1))}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-brand-dark px-2 py-1 rounded-lg cursor-pointer"
                        >
                          <Undo2 className="w-3.5 h-3.5" /> Undo
                        </button>
                        <button
                          onClick={() => setBoxes([])}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-600 px-2 py-1 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {boxes.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">
                      No boxes yet. Drag on the page to create one.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {boxes.map((box, index) => (
                        <button
                          key={box.id}
                          onClick={() => goToPage(box.pageIndex)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/70 text-left cursor-pointer"
                        >
                          <span className="text-xs font-semibold text-gray-700">
                            Box {index + 1} · page {box.pageIndex + 1}
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setBoxes((list) => list.filter((b) => b.id !== box.id));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                setBoxes((list) => list.filter((b) => b.id !== box.id));
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </ToolCard>

                <ToolCard>
                  <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Redaction is permanent: the text and images under each box are deleted from the page content
                      stream, so they cannot be copied, searched or recovered from the output file.
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
                    <ToolPrimaryButton onClick={handleRedact} loading={isProcessing} disabled={boxes.length === 0}>
                      {isProcessing ? (
                        <>
                          <Spinner size={24} color="#ffffff" className="shrink-0" />
                          <span>Redacting...</span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-5 h-5 shrink-0" />
                          <span>Redact PDF</span>
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
                  PDF Redacted Successfully!
                </h2>
                <p className="text-gray-500 text-sm sm:text-base mb-6 max-w-md mx-auto leading-relaxed">
                  The content under your boxes was removed from the document, not just covered.
                </p>

                {stats && (
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-8 text-xs">
                    <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                      {stats.glyphs} characters removed
                    </span>
                    {stats.images > 0 && (
                      <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                        {stats.images} images removed
                      </span>
                    )}
                    {stats.annotations > 0 && (
                      <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                        {stats.annotations} annotations removed
                      </span>
                    )}
                  </div>
                )}

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
                    <span>Redact Another</span>
                  </ToolSecondaryButton>
                </div>
              </ToolCard>

              <RelatedTools currentTool="redact-pdf" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
