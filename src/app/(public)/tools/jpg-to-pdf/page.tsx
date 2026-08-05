'use client';

import { useState } from 'react';
import { Image, Upload, Download, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
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

export default function JpgToPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [margin, setMargin] = useState('none');
  const {
    step,
    setStep,
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
  } = useToolState<Record<string, unknown>>();

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const imageFiles = Array.from(selected).filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...imageFiles]);
    setError(null);
    setSuccess(false);
  };

  const handleRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContinueToOptions = () => {
    if (files.length === 0) {
      setError('Please select at least one image to continue');
      return;
    }
    setError(null);
    goToOptions();
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      formData.append('margin', margin);

      const res = await fetch('/api/tools/jpg-to-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Conversion failed');

      setResult(data.dataUrl);
      setSuccess(true);
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to convert images to PDF');
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
    if (!result || countdown > 0) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = 'converted.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes: string[] = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ToolPageShell title="JPG to PDF" description="Convert JPG, PNG, and WebP images to PDF." icon={Image}>
      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={step} />

        {step === 'upload' && (
          <div className="space-y-6">
            <ToolCard>
              <div className="text-center mb-6">
                <h2 className="font-display font-bold text-xl text-brand-dark mb-2">
                  Upload Your Images
                </h2>
                <p className="text-sm text-gray-500">
                  Select JPG, PNG, or WebP images to convert to PDF
                </p>
              </div>

              {files.length === 0 ? (
                <ToolUploadZone
                  icon={Upload}
                  title="Drop images here"
                  subtitle="or click to browse from your computer"
                  accept="image/*"
                  multiple
                  onFiles={handleFiles}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-700">
                        {files.length} image{files.length !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <button
                      onClick={() => setFiles([])}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {files.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-xl border border-gray-100"
                        />
                        <button
                          onClick={() => handleRemove(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <p className="text-xs text-gray-500 mt-1 truncate">{file.name}</p>
                      </div>
                    ))}
                  </div>

                  <ToolUploadZone
                    icon={Upload}
                    title="Add more images"
                    subtitle="Drag and drop or click to browse"
                    accept="image/*"
                    multiple
                    onFiles={handleFiles}
                  />
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
                disabled={files.length === 0}
                className="min-w-[160px]"
              >
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
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-1">
                    Conversion Settings
                  </h2>
                  <p className="text-sm text-gray-500">
                    Review your images and configure conversion
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
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Selected Images</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {files.map((file, index) => (
                      <div key={index} className="text-center">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Image ${index + 1}`}
                          className="w-full h-16 object-cover rounded-lg border border-gray-100"
                        />
                        <p className="text-[10px] text-gray-500 mt-1 truncate">
                          {index + 1}. {file.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Images</span>
                    <span className="font-semibold text-brand-dark tabular-nums">
                      {files.length}
                    </span>
                  </div>
                  <div className="h-px bg-gray-200/60" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Size</span>
                    <span className="font-semibold text-brand-dark tabular-nums">
                      {formatSize(files.reduce((sum, f) => sum + f.size, 0))}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Margin
                  </label>
                  <select
                    value={margin}
                    onChange={(e) => setMargin(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
                  >
                    <option value="none">None</option>
                    <option value="small">Small</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Your images will be combined into a single PDF document. Each image will be placed on a separate page.
                  </p>
                </div>
              </div>
            </ToolCard>

            <div className="flex justify-end gap-3">
              <ToolSecondaryButton onClick={() => setStep('upload')}>
                Back
              </ToolSecondaryButton>
              <ToolPrimaryButton onClick={handleConvert} loading={isProcessing}>
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <Image className="w-5 h-5 shrink-0" />
                    <span>Convert to PDF</span>
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
                Images Converted Successfully!
              </h2>
              <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                Your images have been combined into a single PDF document. Download your file below.
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
                <ToolSecondaryButton onClick={resetAll} className="flex-1">
                  <Upload className="w-5 h-5 shrink-0" />
                  <span>Convert More Images</span>
                </ToolSecondaryButton>
              </div>
            </ToolCard>

            <RelatedTools currentTool="jpg-to-pdf" />
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
