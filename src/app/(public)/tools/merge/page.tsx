'use client';

import { useState, useRef } from 'react';
import { FileStack, Upload, Trash2, ArrowUp, ArrowDown, Download, RefreshCw, CheckCircle2, AlertCircle, Home, RotateCcw } from 'lucide-react';
import { PageContainer, Section, PageHeader, Card, ActionButton } from '@/components/layout/PageShell';

export default function MergePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const pdfFiles = Array.from(selected).filter((f) => f.type === 'application/pdf');
    setFiles((prev) => [...prev, ...pdfFiles]);
    setError(null);
    setSuccess(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
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

      const link = document.createElement('a');
      link.href = data.dataUrl;
      link.download = 'merged.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to merge PDFs');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setSuccess(false);
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
      <PageContainer>
        <Section>
          <div className="flex flex-col items-center justify-center py-12 max-w-2xl mx-auto">
            <div className="p-5 bg-green-50 text-green-600 rounded-full mb-6">
              <CheckCircle2 className="w-16 h-16 animate-bounce" />
            </div>
            <h2 className="font-display font-bold text-3xl text-brand-dark mb-3">PDFs Merged Successfully!</h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed text-center max-w-md">
              Your files have been combined into a single PDF document. The download was triggered automatically.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 hover:bg-gray-50 font-semibold rounded-2xl border border-gray-200 cursor-pointer transition-all w-full sm:w-auto"
              >
                <RotateCcw className="w-5 h-5" />
                Merge More Files
              </button>
            </div>
          </div>
        </Section>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Section>
        <PageHeader title="Merge PDF" description="Combine multiple PDF documents into a single file." icon={FileStack} />

        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            {files.length === 0 ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center hover:border-brand-red transition-colors cursor-pointer"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'application/pdf';
                  input.multiple = true;
                  input.onchange = (e) => handleFiles((e.target as HTMLInputElement).files);
                  input.click();
                }}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 font-medium mb-1">Click to upload or drag and drop PDF files</p>
                <p className="text-gray-400 text-sm">Select 2 or more PDF files to merge</p>
              </div>
            ) : (
              <Card className="!p-6 !rounded-3xl">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                  <h3 className="font-display font-semibold text-lg text-brand-dark flex items-center gap-2">
                    <FileStack className="w-5 h-5 text-brand-red" />
                    Selected PDFs ({files.length})
                  </h3>
                  <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline cursor-pointer">
                    Clear all
                  </button>
                </div>

                <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-gray-100/50 transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-red-100/50 text-brand-red rounded-lg">
                          <FileStack className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-semibold text-brand-dark truncate">{file.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatSize(file.size)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1.5 text-gray-400 hover:text-brand-dark hover:bg-white rounded-lg border border-transparent disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === files.length - 1}
                          className="p-1.5 text-gray-400 hover:text-brand-dark hover:bg-white rounded-lg border border-transparent disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(index)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg border border-transparent cursor-pointer"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-gray-50 pt-6">
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-brand-red transition-colors cursor-pointer"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'application/pdf';
                      input.multiple = true;
                      input.onchange = (e) => handleFiles((e.target as HTMLInputElement).files);
                      input.click();
                    }}
                  >
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-700 font-medium text-sm">Add more PDF files</p>
                  </div>
                </div>
              </Card>
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

            <button
              onClick={handleMerge}
              disabled={files.length < 2 || isProcessing}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-brand-red text-white disabled:opacity-40 disabled:hover:bg-brand-red hover:bg-red-700 font-semibold rounded-2xl cursor-pointer transition-all shadow-lg shadow-red-500/10 text-xs uppercase tracking-wider"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Merge PDF</span>
                  <Download className="w-5 h-5 shrink-0" />
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </Section>
    </PageContainer>
  );
}