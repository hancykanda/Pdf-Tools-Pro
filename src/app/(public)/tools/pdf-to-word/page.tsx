'use client';

import { useState, useRef } from 'react';
import { FileEdit, Upload, Download, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (selected: File | null) => {
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setText('');
      setError(null);
      setSuccess(false);
    } else {
      setError('Please upload a valid PDF file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleExtract = async () => {
    if (!file) return;
    setIsExtracting(true);
    setError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });

      const cleanBase64 = base64.split(',')[1] || base64;
      const res = await fetch('/api/tools/pdf-to-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: cleanBase64 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');

      setText(data.text || '');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to extract text from PDF');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDownloadWord = () => {
    if (!text) return;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${file?.name?.replace(/\.[^/.]+$/, '') || 'document'}</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #333333; margin: 1in; }
          h1 { color: #1E3A8A; font-family: 'Georgia', serif; font-size: 18pt; margin-bottom: 12pt; }
          p { margin-bottom: 10pt; }
        </style>
      </head>
      <body>
        ${text.split('\n').filter((p) => p.trim() !== '').map((p) => `<p>${p}</p>`).join('\n')}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${file?.name?.replace(/\.[^/.]+$/, '') || 'document'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-red text-white flex items-center justify-center rounded-xl shadow-lg shadow-red-500/10">
          <FileEdit className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-dark">PDF to Word</h1>
          <p className="text-gray-500 text-sm">Extract text from PDF and download as Word document.</p>
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
        <p className="text-gray-400 text-sm">Text will be extracted and formatted for Word</p>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-brand-dark">Selected File</h3>
            <button
              onClick={handleExtract}
              disabled={isExtracting}
              className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                'Extract Text'
              )}
            </button>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-700">{file.name}</span>
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
          Text extracted successfully!
        </div>
      )}

      {text && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-brand-dark">Extracted Text</h3>
            <button
              onClick={handleDownloadWord}
              className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Word
            </button>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 max-h-96 overflow-y-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{text}</pre>
          </div>
        </div>
      )}
    </div>
  );
}