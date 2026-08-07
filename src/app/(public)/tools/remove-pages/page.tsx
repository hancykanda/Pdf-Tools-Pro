'use client';

import { useMemo, useState } from 'react';
import {
  Trash2,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
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
  ProcessingModal,
} from '@/components/layout';
import { Spinner } from '@/components/ui/Spinner';
import {
  PageThumbnail,
  ThumbnailGrid,
  usePdfThumbnails,
  readFileAsDataUrl,
  downloadDataUrl,
  formatSize,
  useCountdownDownload,
} from '@/components/tools/PdfThumbnailGrid';
import { parsePageNumbers } from '@/lib/pageRanges';

export default function RemovePagesPage() {
  return (
    <ErrorBoundary>
      <RemovePagesContent />
    </ErrorBoundary>
  );
}

function RemovePagesContent() {
  const [marked, setMarked] = useState<number[]>([]);
  const [rangeInput, setRangeInput] = useState('');
  const [result, setResult] = useState<{ dataUrl: string; filename: string; pageCount: number } | null>(null);

  const { step, setStep, file, setFile, isProcessing, setIsProcessing, error, setError, goToOptions, goToDownload, resetAll } =
    useToolState();

  const { thumbnails, pageCount, loading: thumbsLoading, error: thumbsError } = usePdfThumbnails(file);
  const { countdown, start: startCountdown } = useCountdownDownload();

  const markedSet = useMemo(() => new Set(marked), [marked]);

  const handleFiles = (selected: FileList | null) => {
    const picked = selected?.[0] || null;
    if (!picked) return;
    if (picked.type !== 'application/pdf' && !picked.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF file');
      return;
    }
    // A new document invalidates the previous selection.
    setError(null);
    setResult(null);
    setRangeInput('');
    setMarked([]);
    setFile(picked);
  };

  const togglePage = (page: number) => {
    setMarked((prev) => (prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page].sort((a, b) => a - b)));
  };

  const applyRangeInput = () => {
    const pages = parsePageNumbers(rangeInput, pageCount);
    if (pages.length === 0) {
      setError('Enter valid page numbers, e.g. 1-3, 5, 7-9');
      return;
    }
    setError(null);
    setMarked(pages);
  };

  const handleContinue = () => {
    if (!file) {
      setError('Please upload a PDF file to continue');
      return;
    }
    setError(null);
    goToOptions();
  };

  const handleRemove = async () => {
    if (!file) return;
    if (marked.length === 0) {
      setError('Click the pages you want to delete first');
      return;
    }
    if (pageCount > 0 && marked.length >= pageCount) {
      setError('You cannot remove every page — keep at least one');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const dataUrl = await readFileAsDataUrl(file);

      const res = await fetch('/api/tools/remove-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: dataUrl, pages: marked, filename: file.name }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to remove pages');
      if (!data.dataUrl) throw new Error('The server did not return a file');

      setResult({
        dataUrl: data.dataUrl,
        filename: data.filename || 'pages-removed.pdf',
        pageCount: data.pageCount ?? 0,
      });
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove pages');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || countdown > 0) return;
    downloadDataUrl(result.dataUrl, result.filename);
  };

  const remaining = Math.max(0, pageCount - marked.length);

  return (
    <ToolPageShell
      title="Remove Pages"
      description="Delete the pages you don't need and keep the rest of the document."
      icon={Trash2}
    >
      <div className="max-w-5xl mx-auto">
        <StepIndicator currentStep={step} labels={{ upload: 'Upload', options: 'Select', download: 'Download' }} />
        <ProcessingModal open={isProcessing} message="Removing pages..." />

        <div key={step} className="animate-slide-up">
          {/* Step 1 — Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="text-center mb-6">
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-2">Upload Your PDF</h2>
                  <p className="text-sm text-gray-500">Then click the pages you want to delete</p>
                </div>

                {!file ? (
                  <ToolUploadZone
                    icon={Upload}
                    title="Drop a PDF file here"
                    subtitle="or click to browse from your computer"
                    accept="application/pdf"
                    onFiles={handleFiles}
                  />
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-2xl">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-green-700 truncate">{file.name}</p>
                      <p className="text-xs text-green-600/80 mt-0.5">
                        {formatSize(file.size)}
                        {pageCount > 0 && ` · ${pageCount} page${pageCount === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        setResult(null);
                        setMarked([]);
                      }}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {(error || thumbsError) && (
                  <div className="mt-4">
                    <ToolAlert type="error">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error || thumbsError}</span>
                    </ToolAlert>
                  </div>
                )}
              </ToolCard>

              <div className="flex justify-end">
                <ToolPrimaryButton onClick={handleContinue} disabled={!file} className="min-w-[200px]">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {/* Step 2 — Select pages */}
          {step === 'options' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div>
                    <h2 className="font-display font-bold text-xl text-brand-dark mb-1">Select Pages to Remove</h2>
                    <p className="text-sm text-gray-500">
                      Click a page to mark it with a red ✕. Marked pages are deleted.
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

                <div className="flex flex-wrap items-end gap-3 mb-6">
                  <label className="flex-1 min-w-[220px]">
                    <span className="block text-sm font-semibold text-gray-700 mb-2">Or type page numbers</span>
                    <input
                      type="text"
                      value={rangeInput}
                      onChange={(e) => setRangeInput(e.target.value)}
                      placeholder="e.g. 1-3, 5, 7-9"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                    />
                  </label>
                  <ToolSecondaryButton onClick={applyRangeInput} disabled={!rangeInput.trim()}>
                    Mark these pages
                  </ToolSecondaryButton>
                  <ToolSecondaryButton onClick={() => setMarked([])} disabled={marked.length === 0}>
                    <X className="w-4 h-4" />
                    Clear selection
                  </ToolSecondaryButton>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Pages marked for removal</span>
                    <span className="font-semibold text-brand-dark tabular-nums">{marked.length}</span>
                  </div>
                  <div className="h-px bg-gray-200/60" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Pages remaining</span>
                    <span className="font-semibold text-brand-dark tabular-nums">{remaining}</span>
                  </div>
                </div>

                {thumbsLoading && thumbnails.length === 0 ? (
                  <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-500">
                    <Spinner size={22} />
                    Rendering page previews…
                  </div>
                ) : (
                  <ThumbnailGrid>
                    {thumbnails.map((thumb) => (
                      <PageThumbnail
                        key={thumb.pageNumber}
                        thumbnail={thumb}
                        marked={markedSet.has(thumb.pageNumber)}
                        onClick={() => togglePage(thumb.pageNumber)}
                        label={
                          markedSet.has(thumb.pageNumber)
                            ? `Page ${thumb.pageNumber} · removing`
                            : `Page ${thumb.pageNumber}`
                        }
                      />
                    ))}
                  </ThumbnailGrid>
                )}

                <div className="mt-6 flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    The pages you keep stay in their original order. Need the opposite? Use the Extract Pages tool.
                  </p>
                </div>
              </ToolCard>

              {error && (
                <ToolAlert type="error">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </ToolAlert>
              )}

              <div className="flex justify-end gap-3">
                <ToolSecondaryButton onClick={() => setStep('upload')} disabled={isProcessing}>
                  Back
                </ToolSecondaryButton>
                <ToolPrimaryButton
                  onClick={handleRemove}
                  loading={isProcessing}
                  disabled={marked.length === 0}
                  className="max-w-xs"
                >
                  {isProcessing ? (
                    <>
                      <Spinner size={24} color="#ffffff" className="shrink-0" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5 shrink-0" />
                      <span>Remove selected ({marked.length})</span>
                    </>
                  )}
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {/* Step 3 — Download */}
          {step === 'download' && result && (
            <div className="space-y-6">
              <ToolCard className="text-center py-12 sm:py-16">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark mb-3">Pages Removed!</h2>
                <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                  Your new document has {result.pageCount} page{result.pageCount === 1 ? '' : 's'}.
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
                  <ToolSecondaryButton
                    onClick={() => {
                      setResult(null);
                      resetAll();
                    }}
                    className="flex-1"
                  >
                    <Upload className="w-5 h-5 shrink-0" />
                    <span>Remove From Another</span>
                  </ToolSecondaryButton>
                </div>
              </ToolCard>

              <RelatedTools currentTool="remove-pages" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
