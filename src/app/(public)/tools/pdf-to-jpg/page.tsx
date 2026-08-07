'use client';

import { useState } from 'react';
import { Image as ImageIcon, Upload, Download, CheckCircle2, AlertCircle, Info } from 'lucide-react';
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

const DPI_OPTIONS = [
  { value: 72, label: '72 DPI', hint: 'Screen / smallest file' },
  { value: 150, label: '150 DPI', hint: 'Balanced (recommended)' },
  { value: 300, label: '300 DPI', hint: 'Print quality' },
  { value: 600, label: '600 DPI', hint: 'Maximum detail' },
];

export default function PdfToJpgPage() {
  const [dpi, setDpi] = useState(150);
  const [format, setFormat] = useState<'jpg' | 'png'>('jpg');
  const [quality, setQuality] = useState(90);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadName, setDownloadName] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const {
    step,
    setStep,
    file,
    setFile,
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

  const handleFile = (files: FileList | null) => {
    const selected = files?.[0] || null;
    if (selected && (selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf'))) {
      setFile(selected);
      setError(null);
      setSuccess(false);
      setDownloadUrl('');
    } else {
      setError('Please upload a valid PDF file');
    }
  };

  const handleContinueToOptions = () => {
    if (!file) {
      setError('Please select a file to continue');
      return;
    }
    setError(null);
    goToOptions();
  };

  const handleConvert = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dpi', String(dpi));
      formData.append('format', format);
      formData.append('quality', String(quality));

      const res = await fetch('/api/tools/pdf-to-jpg', { method: 'POST', body: formData });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Conversion failed');
      }

      const pages = Number(res.headers.get('X-Page-Count') || '0');
      const blob = await res.blob();
      if (blob.size === 0) throw new Error('Conversion produced an empty file');

      const base = file.name.replace(/\.[^/.]+$/, '') || 'document';
      const isZip = blob.type === 'application/zip' || pages > 1;

      setPageCount(pages || 1);
      setDownloadName(isZip ? `${base}-${format}.zip` : `${base}.${format}`);
      setDownloadUrl(URL.createObjectURL(blob));
      setSuccess(true);
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to convert PDF to images');
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
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
    return timer;
  };

  const handleDownload = () => {
    if (!downloadUrl || countdown > 0) return;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = downloadName;
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

  return (
    <ToolPageShell title="PDF to JPG" description="Convert PDF pages to high-quality JPG or PNG images." icon={ImageIcon}>
      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={step} />
        <ProcessingModal open={isProcessing} />
        <div key={step} className="animate-slide-up">

        {step === 'upload' && (
          <div className="space-y-6">
            <ToolCard>
              <div className="text-center mb-6">
                <h2 className="font-display font-bold text-xl text-brand-dark mb-2">Upload Your PDF</h2>
                <p className="text-sm text-gray-500">Select a PDF file to convert into images</p>
              </div>

              {!file ? (
                <ToolUploadZone
                  icon={Upload}
                  title="Drop a PDF file here"
                  subtitle="or click to browse from your computer"
                  accept="application/pdf"
                  onFiles={handleFile}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-700">{file.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
                  </div>
                  <button
                    onClick={() => { setFile(null); setError(null); setDownloadUrl(''); }}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    Remove and select another file
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
              <ToolPrimaryButton onClick={handleContinueToOptions} disabled={!file} className="min-w-[160px]">
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
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-1">Image Settings</h2>
                  <p className="text-sm text-gray-500">Pick the resolution and image format</p>
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
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">{file?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatSize(file?.size || 0)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Resolution (DPI)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {DPI_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDpi(option.value)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                          dpi === option.value ? 'border-brand-red bg-red-50/50' : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <span className="block text-sm font-semibold text-brand-dark">{option.label}</span>
                        <span className="block text-[11px] text-gray-500 mt-0.5 leading-tight">{option.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Image format</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(['jpg', 'png'] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFormat(value)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                          format === value ? 'border-brand-red bg-red-50/50' : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <span className="block text-sm font-semibold text-brand-dark uppercase">{value}</span>
                        <span className="block text-[11px] text-gray-500 mt-0.5 leading-tight">
                          {value === 'jpg' ? 'Smaller files, photo friendly' : 'Lossless, sharp text'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {format === 'jpg' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="jpg-quality" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        JPG quality
                      </label>
                      <span className="text-xs font-semibold text-brand-dark">{quality}%</span>
                    </div>
                    <input
                      id="jpg-quality"
                      type="range"
                      min={40}
                      max={100}
                      step={5}
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full accent-[var(--brand-red,#e5322d)] cursor-pointer"
                    />
                  </div>
                )}

                <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Pages are rendered on the server with poppler (pdftoppm). Multi-page PDFs download as a ZIP archive; a
                    single-page PDF downloads as one image.
                  </p>
                </div>
              </div>
            </ToolCard>

            <div className="flex justify-end gap-3">
              <ToolSecondaryButton onClick={() => setStep('upload')}>Back</ToolSecondaryButton>
              <ToolPrimaryButton onClick={handleConvert} loading={isProcessing}>
                {isProcessing ? (
                  <>
                    <Spinner size={24} color="#ffffff" className="shrink-0" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5 shrink-0" />
                    <span>Convert to Images</span>
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
                Images Ready!
              </h2>
              <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                {pageCount > 1
                  ? `${pageCount} pages were rendered at ${dpi} DPI and packed into a ZIP archive.`
                  : `Your page was rendered at ${dpi} DPI as a single ${format.toUpperCase()} image.`}
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
                      <span>{pageCount > 1 ? 'Download ZIP' : 'Download Image'}</span>
                    </>
                  )}
                </ToolPrimaryButton>
                <ToolSecondaryButton onClick={resetAll} className="flex-1">
                  <Upload className="w-5 h-5 shrink-0" />
                  <span>Convert Another PDF</span>
                </ToolSecondaryButton>
              </div>
            </ToolCard>

            <RelatedTools currentTool="pdf-to-jpg" />
          </div>
        )}
      </div>
        </div>
    </ToolPageShell>
  );
}
