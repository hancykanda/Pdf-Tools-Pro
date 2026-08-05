'use client';

import { useState } from 'react';
import { FileStack, Upload, Download, CheckCircle2, AlertCircle, FileText, ArrowUp, ArrowDown, Plus, X } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import {
  ToolPageShell,
  ToolCard,
  ToolUploadZone,
  ToolPrimaryButton,
  ToolSecondaryButton,
  ToolAlert,
} from '@/components/layout/ToolPageShell';

export default function MergePage() {
  return (
    <ErrorBoundary>
      <MergePageContent />
    </ErrorBoundary>
  );
}

function MergePageContent() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resultData, setResultData] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const pdfFiles = Array.from(selected).filter((f) => f.type === 'application/pdf');
    setFiles((prev) => [...prev, ...pdfFiles]);
    setError(null);
    setSuccess(false);
  };

  const handleRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setFiles((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === files.length - 1) return;
    setFiles((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);
    setError(null);

    try {
      const readFiles = await Promise.all(
        files.map((file) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
          });
        })
      );

      const res = await fetch('/api/tools/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: readFiles }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Merge failed');

      setResultData(data.dataUrl);
      setSuccess(true);
      startCountdown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to merge PDFs');
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
    link.download = 'merged.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setFiles([]);
    setSuccess(false);
    setResultData(null);
    setCountdown(0);
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
      <ToolPageShell title="Merge PDF" description="Combine multiple PDF documents into a single file." icon={FileStack} popular>
        <div className="max-w-2xl mx-auto">
          <ToolCard className="text-center py-12 sm:py-16">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark mb-3">
              PDFs Merged Successfully!
            </h2>
            <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
              Your files have been combined into a single PDF document. Download your merged file below.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
              <ToolPrimaryButton onClick={handleDownload} disabled={countdown > 0} className="flex-1">
                {countdown > 0 ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
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
                <Plus className="w-5 h-5 shrink-0" />
                <span>Merge More Files</span>
              </ToolSecondaryButton>
            </div>
          </ToolCard>
        </div>
      </ToolPageShell>
    );
  }

  return (
    <ToolPageShell title="Merge PDF" description="Combine multiple PDF documents into a single file." icon={FileStack} popular>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Main Workspace */}
        <div className="lg:col-span-8 space-y-6">
          {files.length === 0 ? (
            <ToolCard className="p-0 overflow-hidden">
              <ToolUploadZone
                icon={Upload}
                title="Drop PDF files here"
                subtitle="or click to browse from your computer"
                accept="application/pdf"
                multiple
                onFiles={handleFiles}
              />
            </ToolCard>
          ) : (
            <>
              <ToolCard>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-50 text-brand-red rounded-xl">
                      <FileStack className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-lg text-brand-dark">
                        Selected Files
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {files.length} file{files.length !== 1 ? 's' : ''} •{' '}
                        {formatSize(files.reduce((sum, f) => sum + f.size, 0))} total
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFiles([])}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="group flex items-center gap-4 p-4 bg-gray-50/80 border border-gray-100 rounded-2xl hover:bg-gray-50 hover:border-gray-200 transition-all"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-500 shrink-0">
                        {index + 1}
                      </div>

                      <div className="p-2.5 bg-white border border-gray-100 rounded-xl text-brand-red shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-brand-dark truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatSize(file.size)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-2 text-gray-400 hover:text-brand-dark hover:bg-white rounded-lg border border-transparent hover:border-gray-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent cursor-pointer transition-all"
                          title="Move Up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === files.length - 1}
                          className="p-2 text-gray-400 hover:text-brand-dark hover:bg-white rounded-lg border border-transparent hover:border-gray-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent cursor-pointer transition-all"
                          title="Move Down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(index)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 cursor-pointer transition-all"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <ToolUploadZone
                    icon={Plus}
                    title="Add more PDF files"
                    subtitle="Drag and drop or click to browse"
                    accept="application/pdf"
                    multiple
                    onFiles={handleFiles}
                  />
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
                  <span>PDFs merged successfully! Your download should begin automatically.</span>
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
                    Merge Options
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Combine multiple PDF files into one. Drag and drop the files or use the arrow controls to change their order.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Documents</span>
                    <span className="font-semibold text-brand-dark tabular-nums">
                      {files.length}
                    </span>
                  </div>
                  <div className="h-px bg-gray-200/60" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Combined Size</span>
                    <span className="font-semibold text-brand-dark tabular-nums">
                      {formatSize(files.reduce((sum, f) => sum + f.size, 0))}
                    </span>
                  </div>
                </div>

                <ToolPrimaryButton
                  onClick={handleMerge}
                  disabled={files.length < 2 || isProcessing}
                  loading={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <FileStack className="w-5 h-5 shrink-0" />
                      <span>Merge PDF</span>
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
