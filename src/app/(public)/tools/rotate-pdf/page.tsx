'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RotateCw,
  RotateCcw,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Undo2,
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

const THUMB_HEIGHT = 150;

function formatSize(bytes: number) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function RotatePdfPage() {
  const [thumbs, setThumbs] = useState<RenderedPage[]>([]);
  const [rotations, setRotations] = useState<number[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
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

  const loadThumbnails = useCallback(async (selected: File) => {
    setLoadingPreview(true);
    setThumbs([]);
    setRotations([]);
    try {
      const buffer = await selected.arrayBuffer();
      const collected: RenderedPage[] = [];
      await renderPdfPages(buffer, {
        targetWidth: 190,
        quality: 1.4,
        onPage: (page) => {
          collected.push(page);
          setThumbs([...collected]);
          setRotations((prev) => [...prev, 0]);
        },
      });
      if (collected.length === 0) setError('No pages could be rendered from this PDF');
    } catch {
      setError('Could not render the page previews. You can still rotate every page at once.');
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
    releaseResult();
    setResult(null);
    void loadThumbnails(selectedFile);
  };

  const handleContinueToOptions = () => {
    if (!file) {
      setError('Please select a file to continue');
      return;
    }
    setError(null);
    goToOptions();
  };

  const rotatePage = (index: number, delta: number) => {
    setRotations((prev) => {
      const next = [...prev];
      next[index] = (((next[index] ?? 0) + delta) % 360 + 360) % 360;
      return next;
    });
  };

  const rotateAll = (delta: number) => {
    setRotations((prev) => {
      const length = prev.length || thumbs.length || 1;
      return Array.from({ length }, (_, i) => ((((prev[i] ?? 0) + delta) % 360) + 360) % 360);
    });
  };

  const resetRotations = () => setRotations((prev) => prev.map(() => 0));

  const pendingChanges = rotations.filter((angle) => angle !== 0).length;

  const handleProcess = async () => {
    if (!file) return;

    if (thumbs.length > 0 && pendingChanges === 0) {
      setError('Rotate at least one page before saving');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append(
        'options',
        JSON.stringify(
          rotations.length > 0 ? { rotations } : { rotation: 90 }
        )
      );

      const res = await fetch('/api/tools/rotate-pdf', { method: 'POST', body: form });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Rotation failed');
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
      setError(err instanceof Error ? err.message : 'Failed to rotate PDF');
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
    link.download = (file?.name || 'document').replace(/\.pdf$/i, '') + '-rotated.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    releaseResult();
    setThumbs([]);
    setRotations([]);
    resetAll();
  };

  return (
    <ToolPageShell title="Rotate PDF" description="Rotate PDF pages to any angle." icon={RotateCw}>
      <div className="max-w-5xl mx-auto">
        <StepIndicator currentStep={step} labels={{ upload: 'Upload', options: 'Rotate', download: 'Download' }} />
        <ProcessingModal open={isProcessing} />
        <div key={step} className="animate-slide-up">
          {step === 'upload' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <ToolCard>
                <div className="text-center mb-6">
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-2">Upload Your PDF</h2>
                  <p className="text-sm text-gray-500">We&apos;ll show every page so you can rotate them individually</p>
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
                      <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setFile(null);
                          setThumbs([]);
                          setRotations([]);
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
                      {!loadingPreview && thumbs.length > 0 && (
                        <span className="text-xs text-gray-500">{thumbs.length} page{thumbs.length === 1 ? '' : 's'} ready</span>
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
                  <RotateCw className="w-4 h-4" />
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {step === 'options' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div>
                    <h2 className="font-display font-bold text-xl text-brand-dark mb-1">Rotate pages</h2>
                    <p className="text-sm text-gray-500">
                      Use the arrows on a page, or rotate every page at once.
                    </p>
                  </div>
                  <button
                    onClick={() => setStep('upload')}
                    className="text-xs font-semibold text-gray-500 hover:text-brand-red transition-colors cursor-pointer"
                  >
                    ← Back to Upload
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <ToolSecondaryButton onClick={() => rotateAll(-90)} className="!py-2 !px-4 text-sm">
                    <RotateCcw className="w-4 h-4" /> Rotate all left
                  </ToolSecondaryButton>
                  <ToolSecondaryButton onClick={() => rotateAll(90)} className="!py-2 !px-4 text-sm">
                    <RotateCw className="w-4 h-4" /> Rotate all right
                  </ToolSecondaryButton>
                  <ToolSecondaryButton onClick={resetRotations} disabled={pendingChanges === 0} className="!py-2 !px-4 text-sm">
                    <Undo2 className="w-4 h-4" /> Reset
                  </ToolSecondaryButton>
                  <span className="text-xs text-gray-500 ml-auto">
                    {pendingChanges} of {rotations.length || thumbs.length} page(s) will change
                  </span>
                </div>

                {loadingPreview && thumbs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Spinner size={36} />
                    <p className="text-sm text-gray-500">Rendering page thumbnails…</p>
                  </div>
                )}

                {thumbs.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {thumbs.map((thumb, index) => {
                      const angle = rotations[index] ?? 0;
                      const sideways = angle % 180 !== 0;
                      const ratio = thumb.width / thumb.height;
                      const fitScale = sideways ? Math.min(1, 1 / ratio) : 1;

                      return (
                        <div
                          key={thumb.pageNumber}
                          className={`rounded-2xl border p-3 transition-all ${
                            angle !== 0 ? 'border-brand-red bg-red-50/40' : 'border-gray-100 bg-gray-50'
                          }`}
                        >
                          <div
                            className="flex items-center justify-center overflow-hidden rounded-xl bg-white border border-gray-100"
                            style={{ height: THUMB_HEIGHT + 16 }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={thumb.dataUrl}
                              alt={`Page ${thumb.pageNumber}`}
                              style={{
                                height: THUMB_HEIGHT,
                                width: 'auto',
                                transform: `rotate(${angle}deg) scale(${fitScale})`,
                                transition: 'transform 200ms ease',
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs font-semibold text-gray-500">Page {thumb.pageNumber}</span>
                            <span className="text-[10px] font-bold text-gray-400">{angle}°</span>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => rotatePage(index, -90)}
                              title="Rotate left"
                              className="flex-1 flex items-center justify-center py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-brand-red hover:border-brand-red transition-all cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => rotatePage(index, 90)}
                              title="Rotate right"
                              className="flex-1 flex items-center justify-center py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-brand-red hover:border-brand-red transition-all cursor-pointer"
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!loadingPreview && thumbs.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                    <p className="text-sm text-gray-500">
                      Page previews are unavailable for this file. Saving will rotate every page 90° clockwise.
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
                <ToolPrimaryButton onClick={handleProcess} loading={isProcessing} className="!w-auto">
                  {isProcessing ? (
                    <>
                      <Spinner size={20} color="#ffffff" className="shrink-0" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <RotateCw className="w-5 h-5 shrink-0" />
                      <span>Save rotated PDF</span>
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
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark mb-3">PDF Rotated Successfully!</h2>
                <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                  Your pages have been rotated and the file is ready for download.
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
                    <span>Rotate Another</span>
                  </ToolSecondaryButton>
                </div>
              </ToolCard>
              <RelatedTools currentTool="rotate-pdf" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
