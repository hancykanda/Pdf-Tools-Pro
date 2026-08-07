'use client';

import { useMemo, useState } from 'react';
import {
  Scissors,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Info,
  ArrowRight,
  FileArchive,
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
import { everyNGroups, parseRangeGroups, rangeGroup, type PageGroup } from '@/lib/pageRanges';

type SplitMode = 'range' | 'every' | 'custom';

interface SplitResult {
  dataUrl: string;
  filename: string;
  mimeType: string;
  partCount: number;
  parts: string[];
}

export default function SplitPage() {
  return (
    <ErrorBoundary>
      <SplitPageContent />
    </ErrorBoundary>
  );
}

function SplitPageContent() {
  const [mode, setMode] = useState<SplitMode>('range');
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(0);
  const [everyN, setEveryN] = useState(1);
  const [customRanges, setCustomRanges] = useState('');
  const [result, setResult] = useState<SplitResult | null>(null);

  const { step, setStep, file, setFile, isProcessing, setIsProcessing, error, setError, goToOptions, goToDownload, resetAll } =
    useToolState();

  const { thumbnails, pageCount, loading: thumbsLoading, error: thumbsError } = usePdfThumbnails(file);
  const { countdown, start: startCountdown } = useCountdownDownload();

  const handleFiles = (selected: FileList | null) => {
    const picked = selected?.[0] || null;
    if (!picked) return;
    if (picked.type !== 'application/pdf' && !picked.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF file');
      return;
    }
    setError(null);
    setResult(null);
    setFile(picked);
    setRangeFrom(1);
    setRangeTo(0);
    setEveryN(1);
    setCustomRanges('');
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  /** 0 means "not edited yet" → default to the last page of the document. */
  const effectiveTo = rangeTo > 0 ? Math.min(rangeTo, Math.max(1, pageCount)) : pageCount;

  // Live preview of what the split will produce.
  const groups: PageGroup[] = useMemo(() => {
    if (!pageCount) return [];
    if (mode === 'range') {
      const group = rangeGroup(rangeFrom, effectiveTo || pageCount, pageCount);
      return group ? [group] : [];
    }
    if (mode === 'every') return everyNGroups(pageCount, everyN);
    return parseRangeGroups(customRanges, pageCount);
  }, [mode, rangeFrom, effectiveTo, everyN, customRanges, pageCount]);

  /** page number → 1-based part index, for the grid badges. */
  const partByPage = useMemo(() => {
    const map = new Map<number, number>();
    groups.forEach((group, index) => {
      group.pages.forEach((page) => {
        if (!map.has(page)) map.set(page, index + 1);
      });
    });
    return map;
  }, [groups]);

  const totalSelectedPages = useMemo(
    () => groups.reduce((sum, group) => sum + group.pages.length, 0),
    [groups]
  );

  const handleContinue = () => {
    if (!file) {
      setError('Please upload a PDF file to continue');
      return;
    }
    setError(null);
    goToOptions();
  };

  const handleSplit = async () => {
    if (!file) return;

    if (groups.length === 0) {
      setError(
        mode === 'custom'
          ? 'Enter at least one valid page range, e.g. 1-3, 5, 7-9'
          : 'The selected range does not match any pages'
      );
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const dataUrl = await readFileAsDataUrl(file);

      const payload: Record<string, unknown> = { file: dataUrl, mode, filename: file.name };
      if (mode === 'range') {
        payload.from = rangeFrom;
        payload.to = effectiveTo || pageCount;
      } else if (mode === 'every') {
        payload.everyN = everyN;
      } else {
        payload.ranges = customRanges;
      }

      const res = await fetch('/api/tools/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Split failed');
      if (!data.dataUrl) throw new Error('The server did not return a file');

      setResult({
        dataUrl: data.dataUrl,
        filename: data.filename || 'split.pdf',
        mimeType: data.mimeType || 'application/pdf',
        partCount: data.partCount || 1,
        parts: Array.isArray(data.parts) ? data.parts : [],
      });
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to split PDF');
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
      title="Split PDF"
      description="Extract page ranges or cut a PDF into several documents."
      icon={Scissors}
      popular
    >
      <div className="max-w-5xl mx-auto">
        <StepIndicator currentStep={step} />
        <ProcessingModal open={isProcessing} message="Splitting your PDF..." />

        <div key={step} className="animate-slide-up">
          {/* Step 1 — Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="text-center mb-6">
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-2">Upload Your PDF</h2>
                  <p className="text-sm text-gray-500">Select the PDF you want to split into one or more files</p>
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
                  <div className="space-y-4">
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
                        onClick={clearFile}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>

                    <PageGridPreview
                      loading={thumbsLoading}
                      error={thumbsError}
                      thumbnails={thumbnails}
                    />
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
                <ToolPrimaryButton onClick={handleContinue} disabled={!file} className="min-w-[200px]">
                  Continue to Options
                  <ArrowRight className="w-4 h-4" />
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {/* Step 2 — Options */}
          {step === 'options' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-display font-bold text-xl text-brand-dark mb-1">Split Settings</h2>
                    <p className="text-sm text-gray-500">Choose how the document should be cut up</p>
                  </div>
                  <button
                    onClick={() => setStep('upload')}
                    disabled={isProcessing}
                    className="text-xs font-semibold text-gray-500 hover:text-brand-red transition-colors cursor-pointer disabled:opacity-40"
                  >
                    ← Back to Upload
                  </button>
                </div>

                {/* Mode toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <ModeButton
                    active={mode === 'range'}
                    title="Page range"
                    subtitle="One PDF from a range"
                    onClick={() => setMode('range')}
                  />
                  <ModeButton
                    active={mode === 'every'}
                    title="Every N pages"
                    subtitle="Fixed-size chunks"
                    onClick={() => setMode('every')}
                  />
                  <ModeButton
                    active={mode === 'custom'}
                    title="Custom ranges"
                    subtitle="One PDF per range"
                    onClick={() => setMode('custom')}
                  />
                </div>

                {mode === 'range' && (
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="block text-sm font-semibold text-gray-700 mb-2">From page</span>
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, pageCount)}
                        value={rangeFrom}
                        onChange={(e) => setRangeFrom(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-sm font-semibold text-gray-700 mb-2">To page</span>
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, pageCount)}
                        value={effectiveTo || 1}
                        onChange={(e) => setRangeTo(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                      />
                    </label>
                  </div>
                )}

                {mode === 'every' && (
                  <label className="block">
                    <span className="block text-sm font-semibold text-gray-700 mb-2">Pages per file</span>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, pageCount)}
                      value={everyN}
                      onChange={(e) => setEveryN(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                    />
                    <span className="block text-xs text-gray-500 mt-2">
                      The PDF is cut into consecutive chunks of {Math.max(1, everyN)} page
                      {Math.max(1, everyN) === 1 ? '' : 's'} and delivered as a ZIP archive.
                    </span>
                  </label>
                )}

                {mode === 'custom' && (
                  <label className="block">
                    <span className="block text-sm font-semibold text-gray-700 mb-2">Custom ranges</span>
                    <input
                      type="text"
                      value={customRanges}
                      onChange={(e) => setCustomRanges(e.target.value)}
                      placeholder="e.g. 1-3, 5, 7-9"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                    />
                    <span className="block text-xs text-gray-500 mt-2">
                      Each comma-separated range becomes its own PDF. Multiple ranges are delivered as a ZIP archive.
                    </span>
                  </label>
                )}

                <div className="mt-6 bg-gray-50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Source pages</span>
                    <span className="font-semibold text-brand-dark tabular-nums">{pageCount || '—'}</span>
                  </div>
                  <div className="h-px bg-gray-200/60" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Pages included</span>
                    <span className="font-semibold text-brand-dark tabular-nums">{totalSelectedPages}</span>
                  </div>
                  <div className="h-px bg-gray-200/60" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Files produced</span>
                    <span className="font-semibold text-brand-dark tabular-nums">
                      {groups.length} {groups.length > 1 ? '(ZIP)' : ''}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Highlighted pages below are included in the output. When more than one file is produced you get a
                    ZIP archive containing every part.
                  </p>
                </div>
              </ToolCard>

              <ToolCard>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  Page preview {pageCount > 0 && <span className="text-gray-400">({pageCount} pages)</span>}
                </h3>
                {thumbsLoading && thumbnails.length === 0 ? (
                  <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-500">
                    <Spinner size={22} />
                    Rendering page previews…
                  </div>
                ) : (
                  <ThumbnailGrid>
                    {thumbnails.map((thumb) => {
                      const part = partByPage.get(thumb.pageNumber);
                      return (
                        <PageThumbnail
                          key={thumb.pageNumber}
                          thumbnail={thumb}
                          selected={Boolean(part)}
                          label={
                            part
                              ? groups.length > 1
                                ? `Page ${thumb.pageNumber} · file ${part}`
                                : `Page ${thumb.pageNumber}`
                              : `Page ${thumb.pageNumber}`
                          }
                          className={part ? '' : 'opacity-45'}
                        />
                      );
                    })}
                  </ThumbnailGrid>
                )}
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
                <ToolPrimaryButton onClick={handleSplit} loading={isProcessing} className="max-w-xs">
                  {isProcessing ? (
                    <>
                      <Spinner size={24} color="#ffffff" className="shrink-0" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Scissors className="w-5 h-5 shrink-0" />
                      <span>Split PDF</span>
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
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark mb-3">
                  PDF Split Successfully!
                </h2>
                <p className="text-gray-500 text-sm sm:text-base mb-6 max-w-md mx-auto leading-relaxed">
                  {result.partCount > 1
                    ? `${result.partCount} PDF files were created and packed into a ZIP archive.`
                    : 'Your selected pages have been extracted into a new PDF.'}
                </p>

                {result.parts.length > 1 && (
                  <ul className="mx-auto mb-8 max-w-md space-y-1.5 text-left">
                    {result.parts.slice(0, 12).map((name) => (
                      <li key={name} className="flex items-center gap-2 text-xs text-gray-600">
                        <FileText className="w-3.5 h-3.5 text-brand-red shrink-0" />
                        <span className="truncate">{name}</span>
                      </li>
                    ))}
                    {result.parts.length > 12 && (
                      <li className="text-xs text-gray-400">+ {result.parts.length - 12} more…</li>
                    )}
                  </ul>
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
                    <Scissors className="w-5 h-5 shrink-0" />
                    <span>Split Another</span>
                  </ToolSecondaryButton>
                </div>
              </ToolCard>

              <RelatedTools currentTool="split" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}

function ModeButton({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-2xl border-2 p-4 text-left transition-all cursor-pointer ${
        active
          ? 'border-brand-red bg-red-50/60 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <span className="block text-sm font-semibold text-brand-dark">{title}</span>
      <span className="block text-xs text-gray-500 mt-0.5">{subtitle}</span>
    </button>
  );
}

function PageGridPreview({
  loading,
  error,
  thumbnails,
}: {
  loading: boolean;
  error: string | null;
  thumbnails: { pageNumber: number; dataUrl: string | null; width: number; height: number }[];
}) {
  if (error) {
    return (
      <ToolAlert type="error">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{error}</span>
      </ToolAlert>
    );
  }

  if (loading && thumbnails.length === 0) {
    return (
      <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-500">
        <Spinner size={22} />
        Reading your PDF…
      </div>
    );
  }

  if (thumbnails.length === 0) return null;

  return (
    <div className="max-h-[420px] overflow-y-auto pr-1">
      <ThumbnailGrid>
        {thumbnails.map((thumb) => (
          <PageThumbnail key={thumb.pageNumber} thumbnail={thumb} />
        ))}
      </ThumbnailGrid>
    </div>
  );
}
