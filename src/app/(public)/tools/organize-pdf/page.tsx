'use client';

import { useState, DragEvent } from 'react';
import { FileText, Upload, Download, CheckCircle2, AlertCircle, GripVertical, Plus, Trash2, Info } from 'lucide-react';
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

export default function OrganizePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pages, setPages] = useState<number[]>([]);
  const [isCounting, setIsCounting] = useState(false);
  const {
    step,
    setStep,
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

  const handleFile = async (selected: FileList | null) => {
    const picked = selected?.[0] || null;
    if (!picked || picked.type !== 'application/pdf') {
      setError(picked ? 'Please upload a valid PDF file' : 'Please upload a file');
      return;
    }

    setFile(picked);
    setError(null);
    setSuccess(false);
    setPages([]);
    setPageCount(null);
    setIsCounting(true);

    try {
      const { PDFDocument } = await import('pdf-lib');
      const arrayBuffer = await picked.arrayBuffer();
      const pdfDoc = await PDFDocument.load(new Uint8Array(arrayBuffer));
      const count = pdfDoc.getPageCount();

      setPageCount(count);
      setPages(Array.from({ length: count }, (_, i) => i + 1));
    } catch {
      setError('Could not read the PDF. It may be corrupted.');
      setPageCount(0);
      setPages([]);
    } finally {
      setIsCounting(false);
    }
  };

  const movePage = (from: number, to: number) => {
    if (from === to) return;
    setPages((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(from, 1);
      updated.splice(to, 0, removed);
      return updated;
    });
  };

  const duplicatePage = (index: number) => {
    setPages((prev) => [...prev, prev[index]]);
  };

  const removePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.setData('text/page-index', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData('text/page-index'));
    if (!Number.isNaN(from)) {
      movePage(from, dropIndex);
    }
  };

  const handleContinueToOptions = () => {
    if (!file || pages.length === 0) {
      setError('Please upload a PDF file to continue');
      return;
    }
    setError(null);
    goToOptions();
  };

  const handleOrganize = async () => {
    if (!file || pages.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });

      const res = await fetch('/api/tools/organize-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64, pageOrder: pages }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Organization failed');

      setResult(data.dataUrl);
      setSuccess(true);
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to organize PDF');
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
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);
    return timer;
  };

  const handleDownload = () => {
    if (!result || countdown > 0) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = 'organized.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes: string[] = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ToolPageShell title="Organize PDF" description="Reorder, add, or delete pages in PDFs." icon={FileText}>
      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={step} />
        <ProcessingModal open={isProcessing} />
        <div key={step} className="animate-slide-up">

        {step === 'upload' && (
          <div className="space-y-6">
            <ToolCard>
              <div className="text-center mb-6">
                <h2 className="font-display font-bold text-xl text-brand-dark mb-2">
                  Upload Your PDF
                </h2>
                <p className="text-sm text-gray-500">
                  Select a PDF file to organize its pages
                </p>
              </div>

              {!file ? (
                <ToolUploadZone
                  icon={Upload}
                  title="Drop a PDF file here"
                  subtitle="or click to browse from your computer"
                  accept="application/pdf"
                  onFiles={handleFile}
                />
              ) : isCounting ? (
                <div className="flex items-center gap-4 py-8 justify-center">
                  <div className="w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-600">Reading {file.name}…</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-700">
                        {file.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatSize(file.size)}
                    </span>
                  </div>

                  {pageCount !== null && pages.length > 0 && (
                    <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
                      {pages.map((pageNumber, index) => (
                        <div
                          key={`${pageNumber}-${index}`}
                          data-page-index={index}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                          className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-gray-100/60 transition-colors cursor-grab"
                        >
                          <GripVertical className="w-5 h-5 text-gray-400 shrink-0" />

                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-red/10 text-brand-red font-bold text-sm">
                            {pageNumber}
                          </div>

                          <span className="text-sm font-medium text-gray-700 truncate">
                            Page {pageNumber}
                            <span className="ml-1 text-gray-400">• position {index + 1}</span>
                          </span>

                          <div className="ml-auto flex items-center gap-1">
                            <button
                              onClick={() => duplicatePage(index)}
                              className="p-1.5 text-gray-400 hover:text-brand-dark hover:bg-white rounded-lg border border-transparent cursor-pointer"
                              title="Duplicate page"
                              type="button"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removePage(index)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg border border-transparent cursor-pointer"
                              title="Remove page"
                              type="button"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {pageCount !== null && pages.length === 0 && (
                    <p className="text-xs text-gray-500 mt-4">All pages removed. Upload again to start over.</p>
                  )}

                  <button
                    onClick={() => { setFile(null); setError(null); setPages([]); setPageCount(null); }}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    Upload a different PDF
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
                onClick={handleContinueToOptions}
                disabled={!file || pages.length === 0}
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
                    Organize Settings
                  </h2>
                  <p className="text-sm text-gray-500">
                    Review your page order and finalize
                  </p>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  className="text-xs font-semibold text-gray-500 hover:text-brand-red transition-colors cursor-pointer"
                >
                  ← Back to Upload
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                  <div className="p-3 bg-white border border-gray-100 rounded-xl text-brand-red">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">
                      {file?.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatSize(file?.size || 0)}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Pages to Organize</span>
                    <span className="font-semibold text-brand-dark tabular-nums">
                      {pages.length}
                    </span>
                  </div>
                  {pageCount !== null && (
                    <>
                      <div className="h-px bg-gray-200/60" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Total Pages</span>
                        <span className="font-semibold text-brand-dark tabular-nums">
                          {pageCount}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Drag the handle to reorder pages. Use + to duplicate a page and ✕ to remove it. The pages will be merged in their current order.
                  </p>
                </div>
              </div>
            </ToolCard>

            <div className="flex justify-end gap-3">
              <ToolSecondaryButton onClick={() => setStep('upload')}>
                Back
              </ToolSecondaryButton>
              <ToolPrimaryButton onClick={handleOrganize} loading={isProcessing}>
                {isProcessing ? (
                  <>
                    <Spinner size={24} color="#ffffff" className="shrink-0" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 shrink-0" />
                    <span>Organize Pages</span>
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
                PDF Organized Successfully!
              </h2>
              <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                Your pages have been reordered and merged into a single PDF document.
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
                <ToolSecondaryButton onClick={resetAll} className="flex-1">
                  <Upload className="w-5 h-5 shrink-0" />
                  <span>Organize Another</span>
                </ToolSecondaryButton>
              </div>
            </ToolCard>

            <RelatedTools currentTool="organize-pdf" />
          </div>
        )}
      </div>
        </div>
    </ToolPageShell>
  );
}
