'use client';

import { useState, useRef } from 'react';
import { ImageIcon, Upload, Download, RefreshCw, CheckCircle2, AlertCircle, FileImage } from 'lucide-react';

export default function JpgToPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [margin, setMargin] = useState<'none' | 'small' | 'large'>('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const imageFiles = Array.from(selected).filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...imageFiles]);
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

  const handleConvert = async () => {
    if (files.length === 0) return;
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

      const res = await fetch('/api/tools/jpg-to-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: readFiles, margin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversion failed');

      const link = document.createElement('a');
      link.href = data.dataUrl;
      link.download = 'converted.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to convert images to PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-red text-white flex items-center justify-center rounded-xl shadow-lg shadow-red-500/10">
          <ImageIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-dark">JPG to PDF</h1>
          <p className="text-gray-500 text-sm">Convert JPG, PNG, and WebP images to PDF.</p>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-brand-red transition-colors cursor-pointer mb-6"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-700 font-medium mb-1">Click to upload or drag and drop images</p>
        <p className="text-gray-400 text-sm">Supports JPG, PNG, WebP</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-brand-dark">Selected Images ({files.length})</h3>
            <button
              onClick={() => setFiles([])}
              className="text-xs font-bold text-red-500 hover:text-red-700"
            >
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {files.map((file, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full h-32 object-cover rounded-xl"
                />
                <button
                  onClick={() => handleRemove(index)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <AlertCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Margin</label>
            <select
              value={margin}
              onChange={(e) => setMargin(e.target.value as 'none' | 'small' | 'large')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
            >
              <option value="none">No Margin</option>
              <option value="small">Small Margin</option>
              <option value="large">Large Margin</option>
            </select>
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
          Images converted to PDF successfully!
        </div>
      )}

      <button
        onClick={handleConvert}
        disabled={files.length === 0 || isProcessing}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            Converting...
          </>
        ) : (
          <>
            <FileImage className="w-5 h-5" />
            Convert to PDF
          </>
        )}
      </button>
    </div>
  );
}