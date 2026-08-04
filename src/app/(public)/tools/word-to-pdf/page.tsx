'use client';

import { useState, useRef } from 'react';
import { FileText, Upload, Download, RefreshCw, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';

export default function WordToPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (selected: File | null) => {
    if (selected && (selected.name.endsWith('.docx') || selected.name.endsWith('.doc'))) {
      setFile(selected);
      setError(null);
      setSuccess(false);
    } else {
      setError('Please upload a valid Word document (.docx or .doc)');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleConvert = async () => {
    if (!file) return;
    setIsConverting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/tools/word-to-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Conversion failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'converted.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to convert Word to PDF');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-red text-white flex items-center justify-center rounded-xl shadow-lg shadow-red-500/10">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-dark">Word to PDF</h1>
          <p className="text-gray-500 text-sm">Convert Microsoft Word documents to PDF.</p>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-brand-red transition-colors cursor-pointer mb-6"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-700 font-medium mb-1">Click to upload or drag and drop a Word document</p>
        <p className="text-gray-400 text-sm">Supports .docx and .doc files</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.doc,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />
      </div>

      {file && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="font-display font-semibold text-brand-dark mb-4">Selected File</h3>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-700">{file.name}</span>
            <span className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
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
          Word document converted to PDF successfully!
        </div>
      )}

      <button
        onClick={handleConvert}
        disabled={!file || isConverting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isConverting ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            Converting...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Convert to PDF
          </>
        )}
      </button>
    </div>
  );
}