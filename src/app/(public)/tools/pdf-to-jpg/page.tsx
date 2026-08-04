'use client';

import { useState, useRef, useEffect } from 'react';
import { FileImage, Upload, Download, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PdfToJpgPage() {
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const existing = (window as any).pdfjsLib;
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      };
      document.head.appendChild(script);
    }
  }, []);

  const handleFile = (selected: File | null) => {
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setImages([]);
      setError(null);
      setSuccess(false);
    } else {
      setError('Please upload a valid PDF file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFile(e.dataTransfer.files[0] || null);
  };

  const handleConvert = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) throw new Error('PDF.js is not loaded yet. Please wait a moment and try again.');

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });

      const cleanBase64 = base64.split(',')[1] || base64;
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      const renderedImages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        renderedImages.push(canvas.toDataURL('image/jpeg', 0.92));
      }

      setImages(renderedImages);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to convert PDF to images');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-red text-white flex items-center justify-center rounded-xl shadow-lg shadow-red-500/10">
          <FileImage className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-dark">PDF to JPG</h1>
          <p className="text-gray-500 text-sm">Convert PDF pages to JPG images.</p>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-brand-red transition-colors cursor-pointer mb-6"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-700 font-medium mb-1">Click to upload or drag and drop a PDF file</p>
        <p className="text-gray-400 text-sm">Each page will be converted to a JPG image</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
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

          <button
            onClick={handleConvert}
            disabled={isProcessing}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Convert to Images
              </>
            )}
          </button>
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
          Converted {images.length} page(s) to images.
        </div>
      )}

      {images.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-display font-semibold text-brand-dark mb-4">Converted Images</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {images.map((src, index) => (
              <div key={index} className="relative">
                <img
                  src={src}
                  alt={`Page ${index + 1}`}
                  className="w-full h-40 object-cover rounded-xl border border-gray-100"
                />
                <a
                  href={src}
                  download={`page-${index + 1}.jpg`}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 text-white font-medium opacity-0 hover:opacity-100 transition-opacity rounded-xl"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}