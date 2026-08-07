'use client';

import { useMemo, useState } from 'react';
import {
  FileOutput,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
  FileArchive,
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

export default function ExtractPagesPage() {
  return (
    <ErrorBoundary>
      <ExtractPagesContent />
    </ErrorBoundary>
  );
}

function ExtractPagesContent() {
  const [selected, setSelected] = useState<number[]>([]);
  const [rangeInput, setRangeInput] = useState('');
  const [separate, setSeparate] = useState(false);
  const [result, setResult] = useState<{
    dataUrl: string;
    filename: string;
    mimeType: string;
    pageCount: number;
  } | null>(null);

  const { step, setStep, file, setFile, isProcessing, setIsProcessing, error, setError, goToOptions, goToDownload, resetAll } =
    useToolState();

  const { thumbnails, pageCount, loading: thumbsLoading, error: thumbsError } = usePdfThumbnails(file);
  const { countdown, start: startCountdown } = useCountdownDownload();

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const handleFiles = (picked: FileList | null) => {
    const chosen = picked?.[0] || null;
    if (!chosen) return;
    if (chosen.type !== 'application/pdf' && !chosen.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF file');
      return;
    }
    // A new document invalidates the previous selection.
    setError(null);
    setResult(null);
    setRangeInput('');
    setSelected([]);
    setFile(chosen);
  };

  const togglePage = (page: number) => {
    setSelected((prev) => (prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page].sort((a, b) => a - b)));
  };

  const applyRangeInput = () => {
    const pages = parsePageNumbers(rangeInput, pageCount);
    if (pages.length === 0) {
      setError('Enter valid page numbers, e.g. 1-3, 5, 7-9');
      return;
    }
    setError(null);
    setSelected(pages);
  };

  const handleContinue = () => {
    if (!file) {
      setError('Please upload a PDF file to continue');
      return;
    }
    setError(null);
    goToOptions();
  };

  const handleExtract = async () => {
    if (!file) return;
    if (selected.length === 0) {
      setError('Click the pages you want to keep first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const dataUrl = await readFileAsDataUrl(file);

      const res = await fetch('/api/tools/extract-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: dataUrl, pages: selected, separate, filename: file.name }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to extract pages');
      if (!data.dataUrl) throw new Error('The server did not return a file');

      setResult({
        dataUrl: data.dataUrl,
        filename: data.filename || 'extracted.pdf',
        mimeType: data.mimeType || 'application/pdf',
        pageCount: data.pageCount ?? selected.length,
      });
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to extract pages');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || countdown > 0) return;
    downloadDataUrl(result.dataUrl, result.filename);
  };

  const isZip = result?.mimeType === 'application/zip';

  return (
    <ToolPageShell
      title="Extract Pages"
      description="Pick the pages you want to keep and save them as a new PDF."
      icon={FileOutput}
    >
      <div className="max-w-5xl mx-auto">
        <StepIndicator currentStep={step} labels={{ upload: 'Upload', options: 'Select', download: 'Download' }} />
        <ProcessingModal open={isProcessing} message="Extracting pages..." />

        <div key={step} className="animate-slide-up">
          {/* Step 1 — Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="text-center mb-6">
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-2">Upload Your PDF</h2>
                  <p className="text-sm text-gray-500">Then pick the pages you want to keep</p>
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
                        setSelected([]);
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
                    <h2 className="font-display font-bold text-xl text-brand-dark mb-1">Select Pages to Keep</h2>
                    <p className="text-sm text-gray-500">Selected pages are extracted into a new document.</p>
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
                    Select these pages
                  </ToolSecondaryButton>
                  <ToolSecondaryButton
                    onClick={() => setSelected(thumbnails.map((t) => t.pageNumber))}
                    disabled={pageCount === 0 || selected.length === pageCount}
                  >
                    Select all
                  </ToolSecondaryButton>
                  <ToolSecondaryButton onClick={() => setSelected([])} disabled={selected.length === 0}>
                    <X className="w-4 h-4" />
                    Clear
                  </ToolSecondaryButton>
                </div>

                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl mb-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={separate}
                    onChange={(e) => setSeparate(e.target.checked)}
                    className="h-4 w-4 accent-[color:var(--brand-red,#e5322d)] cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">
                    Save each selected page as its own PDF{' '}
                    <span className="text-gray-400">(downloads as a ZIP archive)</span>
                  </span>
                </label>

                <div className="bg-gray-50 rounded-2xl p-4 space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Pages selected</span>
                    <span className="font-semibold text-brand-dark tabular-nums">{selected.length}</span>
                  </div>
                  <div className="h-px bg-gray-200/60" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Source pages</span>
                    <span className="font-semibold text-brand-dark tabular-nums">{pageCount || '—'}</span>
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
                        selected={selectedSet.has(thumb.pageNumber)}
                        onClick={() => togglePage(thumb.pageNumber)}
                        label={
                          selectedSet.has(thumb.pageNumber)
                            ? `Page ${thumb.pageNumber} · keeping`
                            : `Page ${thumb.pageNumber}`
                        }
                        className={selectedSet.has(thumb.pageNumber) ? '' : 'opacity-55'}
                      />
                    ))}
                  </ThumbnailGrid>
                )}

                <div className="mt-6 flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Extracted pages keep their original order. To throw pages away instead, use the Remove Pages tool.
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
                  onClick={handleExtract}
                  loading={isProcessing}
                  disabled={selected.length === 0}
                  className="max-w-xs"
                >
                  {isProcessing ? (
                    <>
                      <Spinner size={24} color="#ffffff" className="shrink-0" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <FileOutput className="w-5 h-5 shrink-0" />
                      <span>Extract ({selected.length})</span>
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
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark mb-3">Pages Extracted!</h2>
                <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                  {isZip
                    ? `${result.pageCount} single-page PDFs are ready in a ZIP archive.`
                    : `Your new document has ${result.pageCount} page${result.pageCount === 1 ? '' : 's'}.`}
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
                        {isZip ? <FileArchive className="w-5 h-5 shrink-0" /> : <Download className="w-5 h-5 shrink-0" />}
                        <span>{isZip ? 'Download ZIP' : 'Download PDF'}</span>
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
                    <span>Extract From Another</span>
                  </ToolSecondaryButton>
                </div>
              </ToolCard>

              <RelatedTools currentTool="extract-pages" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
