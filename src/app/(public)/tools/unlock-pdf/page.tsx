'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Unlock,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
  ShieldOff,
} from 'lucide-react';
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

function formatSize(bytes: number) {
  if (!bytes) return '0 Bytes';
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${units[i]}`;
}

export default function UnlockPdfPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const resultUrlRef = useRef<string | null>(null);

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
  } = useToolState<Record<string, unknown>>();

  const releaseResult = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  }, []);

  useEffect(() => releaseResult, [releaseResult]);

  const handleFile = (selected: FileList | null) => {
    const picked = selected?.[0] || null;
    if (!picked || picked.type !== 'application/pdf') {
      setError('Please upload a valid PDF file');
      return;
    }
    setFile(picked);
    setError(null);
    setSuccess(false);
    releaseResult();
    setResult(null);
  };

  const handleContinueToOptions = () => {
    if (!file) {
      setError('Please select a file to continue');
      return;
    }
    setError(null);
    goToOptions();
  };

  const startCountdown = () => {
    let remaining = 5;
    setCountdown(remaining);
    const timer = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
    return timer;
  };

  const handleUnlock = async () => {
    if (!file) return;
    if (!password) {
      setError('Enter the password that opens this PDF');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('password', password);

      const res = await fetch('/api/tools/unlock-pdf', { method: 'POST', body: form });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Unlock failed');
      }

      const blob = await res.blob();
      releaseResult();
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult(url);
      setSuccess(true);
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to unlock PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || countdown > 0) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `${(file?.name || 'document').replace(/\.pdf$/i, '')}-unlocked.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    releaseResult();
    setPassword('');
    setShowPassword(false);
    resetAll();
  };

  return (
    <ToolPageShell
      title="Unlock PDF"
      description="Remove password protection from a PDF you have the password for."
      icon={Unlock}
    >
      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={step} labels={{ upload: 'Upload', options: 'Password', download: 'Download' }} />
        <ProcessingModal open={isProcessing} />
        <div key={step} className="animate-slide-up">
          {step === 'upload' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="text-center mb-6">
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-2">Upload Your PDF</h2>
                  <p className="text-sm text-gray-500">Select the password-protected file you want to open freely</p>
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
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                        <span className="text-sm font-semibold text-green-700 truncate">{file.name}</span>
                      </div>
                      <span className="text-xs text-gray-500 shrink-0">{formatSize(file.size)}</span>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        setError(null);
                      }}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      Remove
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
                  Continue
                  <Unlock className="w-4 h-4" />
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {step === 'options' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-display font-bold text-xl text-brand-dark mb-1">Enter the Password</h2>
                    <p className="text-sm text-gray-500">We need the password that currently opens this PDF</p>
                  </div>
                  <button
                    onClick={() => setStep('upload')}
                    className="text-xs font-semibold text-gray-500 hover:text-brand-red transition-colors cursor-pointer"
                  >
                    ← Back to Upload
                  </button>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl mb-6">
                  <div className="p-3 bg-white border border-gray-100 rounded-xl text-brand-red">
                    <Unlock className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">{file?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatSize(file?.size || 0)}</p>
                  </div>
                </div>

                <label className="block text-xs font-semibold text-gray-700 mb-2">Current password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    autoComplete="off"
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleUnlock();
                    }}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                    placeholder="Enter the document password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl mt-4">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    You must know the password — this tool removes protection, it does not crack it. Encryption is
                    stripped with <span className="font-mono">qpdf --decrypt</span> so the result opens without any
                    password.
                  </p>
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
                <ToolSecondaryButton onClick={() => setStep('upload')}>Back</ToolSecondaryButton>
                <ToolPrimaryButton onClick={handleUnlock} loading={isProcessing} disabled={!password}>
                  {isProcessing ? (
                    <>
                      <Spinner size={24} color="#ffffff" className="shrink-0" />
                      <span>Unlocking...</span>
                    </>
                  ) : (
                    <>
                      <ShieldOff className="w-5 h-5 shrink-0" />
                      <span>Unlock PDF</span>
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
                  PDF Unlocked Successfully!
                </h2>
                <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                  The password and all usage restrictions were removed. Your file opens without a password now.
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
                        <span>Download</span>
                      </>
                    )}
                  </ToolPrimaryButton>
                  <ToolSecondaryButton onClick={handleReset} className="flex-1">
                    <Upload className="w-5 h-5 shrink-0" />
                    <span>Unlock Another</span>
                  </ToolSecondaryButton>
                </div>
              </ToolCard>

              <RelatedTools currentTool="unlock-pdf" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
