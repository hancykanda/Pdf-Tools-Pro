'use client';

import { useState, useRef } from 'react';
import { FileStack, Upload, Trash2, ArrowUp, ArrowDown, Download, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function MergePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-red text-white flex items-center justify-center rounded-xl shadow-lg shadow-red-500/10">
          <FileStack className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-dark">Merge PDF</h1>
          <p className="text-gray-500 text-sm">Combine multiple PDF documents into a single file.</p>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-brand-red transition-colors cursor-pointer mb-6"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-700 font-medium mb-1">Click to upload or drag and drop PDF files</p>
        <p className="text-gray-400 text-sm">Select 2 or more PDF files to merge</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-brand-dark">Selected Files ({files.length})</h3>
            <button
              onClick={() => setFiles([])}
              className="text-xs font-bold text-red-500 hover:text-red-700"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-gray-500 w-6 text-center">{index + 1}</span>
                  <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="p-1.5 hover:bg-gray-200 rounded-lg disabled:opacity-40">
                    <ArrowUp className="w-4 h-4 text-gray-600" />
                  </button>
                  <button onClick={() => handleMoveDown(index)} disabled={index === files.length - 1} className="p-1.5 hover:bg-gray-200 rounded-lg disabled:opacity-40">
                    <ArrowDown className="w-4 h-4 text-gray-600" />
                  </button>
                  <button onClick={() => handleRemove(index)} className="p-1.5 hover:bg-red-100 rounded-lg">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm mb-6">
          <CheckCircle2 className="w-4 h-4" />
          PDFs merged successfully! Your download should begin automatically.
        </div>
      )}

      <button
        onClick={handleMerge}
        disabled={files.length < 2 || isProcessing}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            Merging...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Merge PDFs
          </>
        )}
      </button>
    </div>
  );
}