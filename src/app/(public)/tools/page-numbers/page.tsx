'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Hash, Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react';
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

const POSITIONS = [
  { value: 'bottom-center', label: 'Bottom center' },
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'top-center', label: 'Top center' },
  { value: 'top-right', label: 'Top right' },
  { value: 'top-left', label: 'Top left' },
  { value: 'middle-right', label: 'Middle right' },
  { value: 'middle-left', label: 'Middle left' },
];

const FORMATS = [
  { value: '{n}', label: '1, 2, 3' },
  { value: 'Page {n}', label: 'Page 1, Page 2' },
  { value: '{n} of {total}', label: '1 of 10' },
  { value: 'Page {n} of {total}', label: 'Page 1 of 10' },
  { value: '- {n} -', label: '- 1 -' },
];

const FONTS = [
  { value: 'Helvetica', label: 'Helvetica', css: 'Helvetica, Arial, sans-serif' },
  { value: 'TimesRoman', label: 'Times Roman', css: '"Times New Roman", Times, serif' },
  { value: 'Courier', label: 'Courier', css: '"Courier New", Courier, monospace' },
];

function alignmentFor(position: string) {
  const [vertical, horizontal] = position.split('-');
  const justifyContent =
    horizontal === 'left' ? 'flex-start' : horizontal === 'right' ? 'flex-end' : 'center';
  const alignItems = vertical === 'top' ? 'flex-start' : vertical === 'bottom' ? 'flex-end' : 'center';
  return { justifyContent, alignItems };
}

function buildLabel(template: string, current: number, total: number) {
  return template.replace(/\{n\}/gi, String(current)).replace(/\{total\}/gi, String(total));
}

export default function PageNumbersPage() {
  const [position, setPosition] = useState('bottom-center');
  const [startNumber, setStartNumber] = useState(1);
  const [format, setFormat] = useState('{n}');
  const [fontSize, setFontSize] = useState(12);
  const [margin, setMargin] = useState(24);
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [color, setColor] = useState('#000000');
  const [firstPage, setFirstPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [previews, setPreviews] = useState<RenderedPage[]>([]);
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

  const loadPreviews = useCallback(async (selected: File) => {
    setLoadingPreview(true);
    setPreviews([]);
    try {
      const buffer = await selected.arrayBuffer();
      // Render the first page, learn the page count, then add the last page.
      const { getPdfInfo } = await import('@/lib/pdfPreview');
      const info = await getPdfInfo(buffer);
      setPageCount(info.numPages);
      setLastPage(info.numPages);

      const wanted = info.numPages > 1 ? [1, info.numPages] : [1];
      const rendered = await renderPdfPages(buffer, { pages: wanted, targetWidth: 420 });
      setPreviews(rendered);
    } catch {
      setError('Could not render a preview for this PDF. You can still add page numbers.');
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
    setFirstPage(1);
    releaseResult();
    setResult(null);
    void loadPreviews(selectedFile);
  };

  const handleContinueToOptions = () => {
    if (!file) {
      setError('Please select a PDF file to continue');
      return;
    }
    setError(null);
    goToOptions();
  };

  const effectiveFirst = Math.min(Math.max(1, firstPage), Math.max(1, pageCount || 1));
  const effectiveLast = Math.max(effectiveFirst, Math.min(lastPage || pageCount || 1, pageCount || 1));
  const numberedCount = effectiveLast - effectiveFirst + 1;
  const totalLabel = startNumber + numberedCount - 1;

  const labelForPage = useCallback(
    (pageNumber: number) => {
      if (pageNumber < effectiveFirst || pageNumber > effectiveLast) return null;
      return buildLabel(format, startNumber + (pageNumber - effectiveFirst), totalLabel);
    },
    [format, startNumber, effectiveFirst, effectiveLast, totalLabel]
  );

  const fontCss = useMemo(
    () => FONTS.find((f) => f.value === fontFamily)?.css || 'Helvetica, Arial, sans-serif',
    [fontFamily]
  );

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append(
        'options',
        JSON.stringify({
          position,
          startNumber,
          format,
          fontSize,
          margin,
          fontFamily,
          color,
          firstPage: effectiveFirst,
          lastPage: effectiveLast,
        })
      );

      const res = await fetch('/api/tools/page-numbers', { method: 'POST', body: form });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Adding page numbers failed');
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
      setError(err instanceof Error ? err.message : 'Failed to add page numbers');
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
    link.download = (file?.name || 'document').replace(/\.pdf$/i, '') + '-numbered.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    releaseResult();
    setPreviews([]);
    setPageCount(0);
    resetAll();
  };

  const renderPreviewCard = (page: RenderedPage, caption: string) => {
    const label = labelForPage(page.pageNumber);
    const displayWidth = 320;
    const scale = displayWidth / page.width;
    const { justifyContent, alignItems } = alignmentFor(position);

    return (
      <div key={page.pageNumber} className="flex flex-col items-center gap-2">
        <div
          className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white"
          style={{ width: displayWidth, height: page.height * scale }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.dataUrl} alt={caption} className="absolute inset-0 w-full h-full" />
          {label && (
            <div
              className="absolute flex"
              style={{
                inset: margin * scale,
                justifyContent,
                alignItems,
              }}
            >
              <span
                style={{
                  fontSize: fontSize * scale,
                  lineHeight: 1,
                  color,
                  fontFamily: fontCss,
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </div>
          )}
        </div>
        <span className="text-xs font-semibold text-gray-500">
          {caption} (page {page.pageNumber}){!label && ' — not numbered'}
        </span>
      </div>
    );
  };

  return (
    <ToolPageShell title="Add Page Numbers" description="Add page numbers to your PDF document." icon={Hash}>
      <div className="max-w-6xl mx-auto">
        <StepIndicator currentStep={step} labels={{ upload: 'Upload', options: 'Position', download: 'Download' }} />
        <ProcessingModal open={isProcessing} />
        <div key={step} className="animate-slide-up">
          {step === 'upload' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <ToolCard>
                <div className="text-center mb-6">
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-2">Upload Your PDF</h2>
                  <p className="text-sm text-gray-500">You&apos;ll see a live preview of the numbering</p>
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
                          setPreviews([]);
                          setPageCount(0);
                          setError(null);
                        }}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        Remove
                      </button>
                      {loadingPreview && (
                        <span className="flex items-center gap-2 text-xs text-gray-500">
                          <Spinner size={14} /> Preparing preview…
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
                  <Hash className="w-4 h-4" />
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {step === 'options' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <ToolCard className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="font-display font-bold text-xl text-brand-dark mb-1">Numbering</h2>
                      <p className="text-sm text-gray-500">Set position, start value and format</p>
                    </div>
                    <button
                      onClick={() => setStep('upload')}
                      className="text-xs font-semibold text-gray-500 hover:text-brand-red transition-colors cursor-pointer"
                    >
                      ← Back
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">Position</label>
                      <select
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                      >
                        {POSITIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Start number</label>
                        <input
                          type="number"
                          min={0}
                          value={startNumber}
                          onChange={(e) => setStartNumber(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Format</label>
                        <select
                          value={format}
                          onChange={(e) => setFormat(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                        >
                          {FORMATS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Font size: {fontSize}pt</label>
                        <input
                          type="range"
                          min={6}
                          max={36}
                          step={1}
                          value={fontSize}
                          onChange={(e) => setFontSize(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Margin: {margin}pt</label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={2}
                          value={margin}
                          onChange={(e) => setMargin(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Font</label>
                        <select
                          value={fontFamily}
                          onChange={(e) => setFontFamily(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                        >
                          {FONTS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Color</label>
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="w-full h-[46px] px-2 py-1 rounded-xl border border-gray-200 cursor-pointer"
                        />
                      </div>
                    </div>

                    {pageCount > 1 && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2">From page</label>
                          <input
                            type="number"
                            min={1}
                            max={pageCount}
                            value={firstPage}
                            onChange={(e) => setFirstPage(Number(e.target.value) || 1)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2">To page</label>
                          <input
                            type="number"
                            min={1}
                            max={pageCount}
                            value={lastPage}
                            onChange={(e) => setLastPage(Number(e.target.value) || pageCount)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-500">
                      {numberedCount} page{numberedCount === 1 ? '' : 's'} will be numbered
                      {pageCount > 0 ? ` (${effectiveFirst}–${effectiveLast} of ${pageCount})` : ''}.
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
                </ToolCard>

                <ToolCard className="lg:col-span-3">
                  <h3 className="font-display font-bold text-lg text-brand-dark mb-1">Live preview</h3>
                  <p className="text-sm text-gray-500 mb-6">First and last page, exactly as they will be numbered.</p>

                  {loadingPreview && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Spinner size={36} />
                      <p className="text-sm text-gray-500">Rendering preview…</p>
                    </div>
                  )}

                  {!loadingPreview && previews.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-6">
                      {previews.map((page, index) =>
                        renderPreviewCard(page, index === 0 ? 'First page' : 'Last page')
                      )}
                    </div>
                  )}

                  {!loadingPreview && previews.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                      <p className="text-sm text-gray-500">Preview unavailable — numbering will still be applied.</p>
                    </div>
                  )}
                </ToolCard>
              </div>

              <div className="flex justify-end gap-3">
                <ToolSecondaryButton onClick={() => setStep('upload')}>Back</ToolSecondaryButton>
                <ToolPrimaryButton onClick={handleProcess} loading={isProcessing} className="!w-auto">
                  {isProcessing ? (
                    <>
                      <Spinner size={20} color="#ffffff" className="shrink-0" />
                      <span>Applying…</span>
                    </>
                  ) : (
                    <>
                      <Hash className="w-5 h-5 shrink-0" />
                      <span>Apply page numbers</span>
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
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark mb-3">
                  Page Numbers Added!
                </h2>
                <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                  Your numbered PDF is ready for download.
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
                    <span>Number Another</span>
                  </ToolSecondaryButton>
                </div>
              </ToolCard>
              <RelatedTools currentTool="page-numbers" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
