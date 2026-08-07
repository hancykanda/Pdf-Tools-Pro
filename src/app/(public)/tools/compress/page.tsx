'use client';

import { useState } from 'react';
import { ShieldCheck, Upload, Download, CheckCircle2, AlertCircle, Info } from 'lucide-react';
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

type CompressionLevel = 'low' | 'medium' | 'high';

const LEVELS: {
  value: CompressionLevel;
  title: string;
  hint: string;
  preset: string;
}[] = [
  {
    value: 'low',
    title: 'Low quality',
    hint: 'Smallest file — best for email and web sharing',
    preset: '/screen',
  },
  {
    value: 'medium',
    title: 'Medium quality',
    hint: 'Balanced size and quality — recommended',
    preset: '/ebook',
  },
  {
    value: 'high',
    title: 'High quality',
    hint: 'Largest file — keeps the most detail for printing',
    preset: '/printer',
  },
];

export default function CompressPage() {
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [level, setLevel] = useState<CompressionLevel>('medium');
  const {
    step,
    setStep,
    file,
    setFile,
    result,
    setResult,
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
  } = useToolState<Record<string, unknown>>({
    onReset: () => {
      setOriginalSize(0);
      setCompressedSize(0);
      setLevel('medium');
    },
  });

  const handleFile = (selected: FileList | null) => {
    const selectedFile = selected?.[0] || null;
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setOriginalSize(selectedFile.size);
      setCompressedSize(0);
      setError(null);
      setSuccess(false);
    } else {
      setError('Please upload a valid PDF file');
    }
  };

  const handleContinueToOptions = () => {
    if (!file) {
      setError('Please select a PDF file to continue');
      return;
    }
    setError(null);
    goToOptions();
  };

  const handleCompress = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('level', level);

      const res = await fetch('/api/tools/compress', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Compression failed');
      }

      const blob = await res.blob();
      const before = Number(res.headers.get('X-Original-Size')) || file.size;
      const after = Number(res.headers.get('X-Compressed-Size')) || blob.size;

      setOriginalSize(before);
      setCompressedSize(after);
      setResult(URL.createObjectURL(blob));
      setSuccess(true);
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to compress PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const savedPercent =
    originalSize > 0 && compressedSize > 0 ? (1 - compressedSize / originalSize) * 100 : 0;
  const savings = savedPercent.toFixed(1);

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
    if (!result || countdown > 0) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `${(file?.name || 'document').replace(/\.pdf$/i, '')}-compressed.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ToolPageShell title="Compress PDF" description="Reduce PDF file size while preserving quality." icon={ShieldCheck}>
      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={step} />
        <ProcessingModal
          open={isProcessing}
          message="Compressing your PDF..."
          submessage="Ghostscript is re-encoding the document. Keep this tab open."
        />
        <div key={step} className="animate-slide-up">

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            <ToolCard>
              <div className="text-center mb-6">
                <h2 className="font-display font-bold text-xl text-brand-dark mb-2">
                  Upload Your PDF
                </h2>
                <p className="text-sm text-gray-500">
                  Select a PDF file to compress
                </p>
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
                      <span className="text-sm font-semibold text-green-700">
                        {file.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatSize(file.size)}
                    </span>
                  </div>

                  <button
                    onClick={() => { setFile(null); setError(null); }}
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
              <ToolPrimaryButton
                onClick={handleContinueToOptions}
                disabled={!file}
                className="min-w-[160px]"
              >
                Continue to Options
                <Download className="w-4 h-4" />
              </ToolPrimaryButton>
            </div>
          </div>
        )}

        {/* Step 2: Options */}
        {step === 'options' && (
          <div className="space-y-6">
            <ToolCard>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-1">
                    Compression Level
                  </h2>
                  <p className="text-sm text-gray-500">
                    Choose how much quality to trade for a smaller file
                  </p>
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
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">
                      {file?.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatSize(originalSize)}
                    </p>
                  </div>
                </div>

                <fieldset className="space-y-3">
                  <legend className="block text-sm font-semibold text-gray-700 mb-2">
                    Compression
                  </legend>
                  {LEVELS.map((option) => {
                    const selected = level === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                          selected
                            ? 'border-brand-red bg-red-50/60 ring-2 ring-brand-red/15'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="compression-level"
                          value={option.value}
                          checked={selected}
                          onChange={() => setLevel(option.value)}
                          className="mt-1 h-4 w-4 accent-[var(--color-brand-red)] cursor-pointer"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-brand-dark">{option.title}</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              {option.preset}
                            </span>
                          </span>
                          <span className="block text-xs text-gray-500 mt-0.5">{option.hint}</span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>

                <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Your PDF is re-encoded with Ghostscript, which downsamples images and subsets
                    fonts. You will see the before and after size once it finishes.
                  </p>
                </div>
              </div>

              {error && (
                <div className="mt-4">
                  <ToolAlert type="error">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </ToolAlert>
                </div>
              )}
            </ToolCard>

            <div className="flex justify-end gap-3">
              <ToolSecondaryButton onClick={() => setStep('upload')}>
                Back
              </ToolSecondaryButton>
              <ToolPrimaryButton onClick={handleCompress} loading={isProcessing}>
                {isProcessing ? (
                  <>
                    <Spinner size={24} color="#ffffff" className="shrink-0" />
                    <span>Compressing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    <span>Compress PDF</span>
                  </>
                )}
              </ToolPrimaryButton>
            </div>
          </div>
        )}

        {/* Step 3: Download */}
        {step === 'download' && (
          <div className="space-y-6">
            <ToolCard className="text-center py-12 sm:py-16">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark mb-3">
                PDF Compressed Successfully!
              </h2>
              <p className="text-gray-500 text-sm sm:text-base mb-6 max-w-md mx-auto leading-relaxed">
                Your PDF has been compressed and is ready for download.
              </p>

              {compressedSize > 0 && (
                <div className="max-w-md mx-auto mb-8">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">Before</p>
                      <p className="text-lg font-bold text-brand-dark">{formatSize(originalSize)}</p>
                    </div>
                    <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-green-600/70 mb-1">After</p>
                      <p className="text-lg font-bold text-green-700">{formatSize(compressedSize)}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-green-600 mt-3">
                    {savedPercent > 0.05
                      ? `Saved ${savings}% (${formatSize(Math.max(originalSize - compressedSize, 0))})`
                      : 'Already optimized — the original was kept because it was smaller.'}
                  </p>
                </div>
              )}

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
                <ToolSecondaryButton onClick={resetAll} className="flex-1">
                  <Upload className="w-5 h-5 shrink-0" />
                  <span>Compress Another</span>
                </ToolSecondaryButton>
              </div>
            </ToolCard>

            <RelatedTools currentTool="compress-pdf" />
          </div>
        )}
      </div>
        </div>
    </ToolPageShell>
  );
}
