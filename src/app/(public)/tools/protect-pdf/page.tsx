'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Lock,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Printer,
  Copy,
  ShieldCheck,
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

function passwordStrength(password: string): { label: string; score: number; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (password.length === 0) return { label: '', score: 0, color: 'bg-gray-200' };
  if (score <= 2) return { label: 'Weak', score, color: 'bg-red-500' };
  if (score <= 3) return { label: 'Fair', score, color: 'bg-amber-500' };
  if (score === 4) return { label: 'Good', score, color: 'bg-lime-500' };
  return { label: 'Strong', score, color: 'bg-green-600' };
}

export default function ProtectPdfPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(false);
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
      setError('Please select a PDF file to continue');
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

  const strength = passwordStrength(password);
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;
  const canSubmit = password.length >= 4 && password === confirmPassword;

  const handleProtect = async () => {
    if (!file) return;
    if (password.length < 4) {
      setError('Please use a password with at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('password', password);
      form.append('confirmPassword', confirmPassword);
      form.append('allowPrinting', String(allowPrinting));
      form.append('allowCopying', String(allowCopying));

      const res = await fetch('/api/tools/protect-pdf', { method: 'POST', body: form });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Protection failed');
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
      setError(err instanceof Error ? err.message : 'Failed to protect PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || countdown > 0) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `${(file?.name || 'document').replace(/\.pdf$/i, '')}-protected.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    releaseResult();
    setPassword('');
    setConfirmPassword('');
    setAllowPrinting(true);
    setAllowCopying(false);
    resetAll();
  };

  return (
    <ToolPageShell
      title="Protect PDF"
      description="Encrypt a PDF with AES-256 password protection and usage permissions."
      icon={Lock}
    >
      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={step} labels={{ upload: 'Upload', options: 'Protect', download: 'Download' }} />
        <ProcessingModal open={isProcessing} />
        <div key={step} className="animate-slide-up">
          {step === 'upload' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="text-center mb-6">
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-2">Upload Your PDF</h2>
                  <p className="text-sm text-gray-500">Select a PDF file to protect with a password</p>
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
                  Continue
                  <Lock className="w-4 h-4" />
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {step === 'options' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-display font-bold text-xl text-brand-dark mb-1">Protection Settings</h2>
                    <p className="text-sm text-gray-500">Choose a password and what readers are allowed to do</p>
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
                    <Lock className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">{file?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatSize(file?.size || 0)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        autoComplete="new-password"
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                        placeholder="Enter a password"
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

                    {password.length > 0 && (
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${strength.color}`}
                            style={{ width: `${(strength.score / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-gray-500">{strength.label}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Confirm password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      autoComplete="new-password"
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && canSubmit) void handleProtect();
                      }}
                      className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-700 focus:outline-none focus:ring-2 focus:border-transparent ${
                        mismatch
                          ? 'border-red-300 focus:ring-red-400'
                          : 'border-gray-200 focus:ring-brand-red'
                      }`}
                      placeholder="Repeat the password"
                    />
                    {mismatch && <p className="text-xs text-red-600 mt-1.5">The passwords do not match</p>}
                  </div>

                  <div className="pt-2">
                    <p className="text-xs font-semibold text-gray-700 mb-3">Permissions for readers</p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-100/60 transition-colors">
                        <input
                          type="checkbox"
                          checked={allowPrinting}
                          onChange={(e) => setAllowPrinting(e.target.checked)}
                          className="w-4 h-4 accent-[var(--brand-red,#e5322d)] cursor-pointer"
                        />
                        <Printer className="w-4 h-4 text-gray-500 shrink-0" />
                        <span className="text-sm text-gray-700 flex-1">Allow printing</span>
                      </label>

                      <label className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-100/60 transition-colors">
                        <input
                          type="checkbox"
                          checked={allowCopying}
                          onChange={(e) => setAllowCopying(e.target.checked)}
                          className="w-4 h-4 accent-[var(--brand-red,#e5322d)] cursor-pointer"
                        />
                        <Copy className="w-4 h-4 text-gray-500 shrink-0" />
                        <span className="text-sm text-gray-700 flex-1">Allow copying text &amp; editing</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      The file is encrypted with AES-256 (<span className="font-mono">qpdf --encrypt</span>). Keep the
                      password safe — without it the document cannot be recovered.
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
                <ToolSecondaryButton onClick={() => setStep('upload')}>Back</ToolSecondaryButton>
                <ToolPrimaryButton onClick={handleProtect} loading={isProcessing} disabled={!canSubmit}>
                  {isProcessing ? (
                    <>
                      <Spinner size={24} color="#ffffff" className="shrink-0" />
                      <span>Protecting...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 shrink-0" />
                      <span>Protect PDF</span>
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
                  PDF Protected Successfully!
                </h2>
                <p className="text-gray-500 text-sm sm:text-base mb-6 max-w-md mx-auto leading-relaxed">
                  Your PDF is encrypted with AES-256. Readers will be asked for the password when opening it.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 mb-8 text-xs">
                  <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 font-semibold">AES-256</span>
                  <span
                    className={`px-3 py-1.5 rounded-full font-semibold ${
                      allowPrinting ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {allowPrinting ? 'Printing allowed' : 'Printing blocked'}
                  </span>
                  <span
                    className={`px-3 py-1.5 rounded-full font-semibold ${
                      allowCopying ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {allowCopying ? 'Copying allowed' : 'Copying blocked'}
                  </span>
                </div>

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
                  <ToolSecondaryButton onClick={handleReset} className="flex-1">
                    <Upload className="w-5 h-5 shrink-0" />
                    <span>Protect Another</span>
                  </ToolSecondaryButton>
                </div>
              </ToolCard>

              <RelatedTools currentTool="protect-pdf" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
