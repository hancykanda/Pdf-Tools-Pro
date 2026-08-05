'use client';

import { useState } from 'react';
import { FileStack, Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import {
  ToolPageShell,
  ToolCard,
  ToolUploadZone,
  ToolPrimaryButton,
  ToolSecondaryButton,
  ToolAlert,
  FileItem,
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
        <ToolCard>
          <div className="flex flex-col items-center justify-center py-12 max-w-2xl mx-auto">
            <div className="p-5 bg-green-50 text-green-600 rounded-full mb-6">
              <CheckCircle2 className="w-16 h-16 animate-bounce" />
            </div>
            <h2 className="font-display font-bold text-3xl text-brand-dark mb-3">PDFs Merged Successfully!</h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed text-center max-w-md">
              Your files have been combined into a single PDF document.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <ToolPrimaryButton onClick={handleDownload} disabled={countdown > 0}>
                {countdown > 0 ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Please wait {countdown}s...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 shrink-0" />
                    Download PDF
                  </>
                )}
              </ToolPrimaryButton>
              <ToolSecondaryButton onClick={handleReset}>
                <Upload className="w-5 h-5" />
                Merge More Files
              </ToolSecondaryButton>
            </div>
          </div>
        </ToolCard>
      </ToolPageShell>
    );
  }

  return (
    <ToolPageShell title="Merge PDF" description="Combine multiple PDF documents into a single file." icon={FileStack} popular>
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {files.length === 0 ? (
            <ToolUploadZone
              icon={Upload}
              title="Click to upload or drag and drop PDF files"
              subtitle="Select 2 or more PDF files to merge"
              accept="application/pdf"
              multiple
              onFiles={handleFiles}
            />
          ) : (
            <ToolCard>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                <h3 className="font-display font-semibold text-lg text-brand-dark flex items-center gap-2">
                  <FileStack className="w-5 h-5 text-brand-red" />
                  Selected PDFs ({files.length})
                </h3>
                <button
                  onClick={() => setFiles([])}
                  className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              </div>

              <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
                {files.map((file, index) => (
                  <FileItem
                    key={index}
                    name={file.name}
                    size={formatSize(file.size)}
                    onRemove={() => handleRemove(index)}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                    canMoveUp={index !== 0}
                    canMoveDown={index !== files.length - 1}
                  />
                ))}
              </div>

              <div className="mt-6 border-t border-gray-50 pt-6">
                <ToolUploadZone
                  icon={Upload}
                  title="Add more PDF files"
                  subtitle="Drag and drop or click to browse"
                  accept="application/pdf"
                  multiple
                  onFiles={handleFiles}
                />
              </div>
            </ToolCard>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-fit">
          <div>
            <h3 className="font-display font-semibold text-lg text-brand-dark mb-4">Merge PDF Options</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-6 font-sans">
              Combine multiple PDF files into one. Drag and drop the list files or use the arrow controls on the left to change their order.
            </p>

            <div className="space-y-4 bg-gray-50 p-4 rounded-2xl mb-6">
              <div className="flex justify-between text-xs font-semibold text-gray-500">
                <span>Total Documents:</span>
                <span className="text-brand-dark">{files.length}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-gray-500">
                <span>Combined Size:</span>
                <span className="text-brand-dark">{formatSize(files.reduce((sum, f) => sum + f.size, 0))}</span>
              </div>
            </div>
          </div>

          <ToolPrimaryButton onClick={handleMerge} disabled={files.length < 2 || isProcessing}>
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Merge PDF</span>
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </>
            )}
          </ToolPrimaryButton>
        </div>
      </div>

      {error && (
        <div className="mt-6">
          <ToolAlert type="error">
            <AlertCircle className="w-4 h-4" />
            {error}
          </ToolAlert>
        </div>
      )}
    </ToolPageShell>
  );
}
