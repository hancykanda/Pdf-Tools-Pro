'use client';

import { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Scissors, Upload, Download, CheckCircle2, AlertCircle, FileText, Info, X } from 'lucide-react';
import {
  ToolPageShell,
  ToolCard,
  ToolUploadZone,
  ToolPrimaryButton,
  ToolSecondaryButton,
  ToolAlert,
} from '@/components/layout/ToolPageShell';

// Safety cap used when the page count could not be determined in the browser.
const MAX_PAGE_LIMIT = 5000;

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pageRange, setPageRange] = useState('1-1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resultData, setResultData] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Counts pages in the browser with pdfjs-dist. Purely informational: if it
  // fails we still let the upload proceed and let the API do the work.
  const countPages = async (selected: File) => {
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();

      const data = new Uint8Array(await selected.arrayBuffer());
      const loadingTask = pdfjs.getDocument({ data });
      const doc = await loadingTask.promise;
      setPageCount(doc.numPages);
      await loadingTask.destroy();
    } catch {
      setPageCount(null);
    }
  };

  const handleFile = (selected: File | null) => {
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setPageCount(null);
      setError(null);
      setSuccess(false);
      void countPages(selected);
    } else {
      setError('Please upload a valid PDF file');
    }
  };

  const parsePageRange = (range: string, maxPages: number | null): number[] => {
    const indices: number[] = [];
    const limit = maxPages ?? MAX_PAGE_LIMIT;
    const parts = range.split(',').map((p) => p.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
        for (let i = start; i <= end && i <= limit; i++) {
          if (i >= 1) indices.push(i - 1);
        }
      } else {
        const num = Number(part);
        if (Number.isFinite(num) && num >= 1 && num <= limit) indices.push(num - 1);
      }
    }

    return [...new Set(indices)].sort((a, b) => a - b);
  };

  const handleSplit = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });

      const cleanBase64 = base64.split(',')[1] || base64;
      if (!cleanBase64) {
        throw new Error('Could not read the selected file. Please try again.');
      }

      const pageIndices = parsePageRange(pageRange, pageCount);
      if (pageIndices.length === 0) {
        throw new Error(
          pageCount
            ? `Invalid page range. This PDF has ${pageCount} page${pageCount === 1 ? '' : 's'}.`
            : 'Invalid page range. Please check the format.'
        );
      }

      const res = await fetch('/api/tools/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64, pageIndices }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Split failed');

      setResultData(result.dataUrl);
      setSuccess(true);
      startCountdown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to split PDF');
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
    if (!resultData || countdown > 0) return;
    const link = document.createElement('a');
    link.href = resultData;
    link.download = 'split.pdf';
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

  if (success) {
    return (
      <ToolPageShell title="Split PDF" description="Extract specific pages or page ranges from your PDF." icon={Scissors}>
        <div className="max-w-2xl mx-auto">
          <ToolCard className="text-center py-12 sm:py-16">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark mb-3">
              PDF Split Successfully!
            </h2>
            <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
              Your selected pages have been extracted and are ready for download.
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
              <ToolSecondaryButton onClick={() => { setSuccess(false); setResultData(null); setCountdown(0); }} className="flex-1">
                <Scissors className="w-5 h-5 shrink-0" />
                <span>Split Another</span>
              </ToolSecondaryButton>
            </div>
          </ToolCard>
        </div>
      </ToolPageShell>
    );
  }

  return (
    <ToolPageShell title="Split PDF" description="Extract specific pages or page ranges from your PDF." icon={Scissors}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Main Workspace */}
        <div className="lg:col-span-8 space-y-6">
          {!file ? (
            <ToolCard className="p-0 overflow-hidden">
              <ToolUploadZone
                icon={Upload}
                title="Drop a PDF file here"
                subtitle="or click to browse from your computer"
                accept="application/pdf"
                onFiles={(files) => handleFile(files?.[0] || null)}
              />
            </ToolCard>
          ) : (
            <>
              <ToolCard>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-red-50 text-brand-red rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-lg text-brand-dark truncate">
                      {file.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatSize(file.size)}
                      {pageCount !== null && ` · ${pageCount} page${pageCount === 1 ? '' : 's'}`}
                    </p>
                  </div>
                  <button
                    onClick={() => { setFile(null); setPageCount(null); }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Page Range
                    </label>
                    <input
                      type="text"
                      value={pageRange}
                      onChange={(e) => setPageRange(e.target.value)}
                      placeholder="e.g., 1-3, 5, 7-9"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                      Enter page numbers or ranges. Use commas to separate multiple pages (e.g., 1-3, 5, 7-9).
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Page numbering starts at 1. The extracted pages will be saved as a new PDF file.
                    </p>
                  </div>
                </div>
              </ToolCard>

              {error && (
                <ToolAlert type="error">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </ToolAlert>
              )}

              {success && (
                <ToolAlert type="success">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>PDF split successfully! Your download should begin automatically.</span>
                </ToolAlert>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-8 space-y-6">
            <ToolCard>
              <div className="space-y-6">
                <div>
                  <h3 className="font-display font-semibold text-lg text-brand-dark mb-2">
                    Split Options
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Extract specific pages from your PDF. Use the page range input to select which pages to extract.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">File</span>
                    <span className="font-medium text-brand-dark truncate max-w-[180px]">
                      {file ? file.name : 'None selected'}
                    </span>
                  </div>
                  <div className="h-px bg-gray-200/60" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Pages</span>
                    <span className="font-medium text-brand-dark tabular-nums">
                      {pageCount !== null ? pageCount : '—'}
                    </span>
                  </div>
                  <div className="h-px bg-gray-200/60" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Page Range</span>
                    <span className="font-medium text-brand-dark tabular-nums">
                      {pageRange || '—'}
                    </span>
                  </div>
                </div>

                <ToolPrimaryButton
                  onClick={handleSplit}
                  disabled={!file || isProcessing}
                  loading={isProcessing}
                  className="w-full"
                >
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
            </ToolCard>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
