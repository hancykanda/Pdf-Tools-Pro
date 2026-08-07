'use client';

import { useEffect, useRef, useState } from 'react';
import { Scan, Upload, Download, CheckCircle2, AlertCircle, Info } from 'lucide-react';
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

interface OcrLanguage {
  code: string;
  label: string;
  available?: boolean;
}

/** Mirrors the allow-list in `/api/tools/ocr-pdf`; refined by the GET probe below. */
const FALLBACK_LANGUAGES: OcrLanguage[] = [
  { code: 'eng', label: 'English' },
  { code: 'fra', label: 'French' },
  { code: 'deu', label: 'German' },
  { code: 'spa', label: 'Spanish' },
  { code: 'ita', label: 'Italian' },
  { code: 'por', label: 'Portuguese' },
  { code: 'nld', label: 'Dutch' },
  { code: 'rus', label: 'Russian' },
  { code: 'chi_sim', label: 'Chinese (Simplified)' },
  { code: 'jpn', label: 'Japanese' },
  { code: 'kor', label: 'Korean' },
  { code: 'ara', label: 'Arabic' },
];

export default function OCRPDFPage() {
  const [language, setLanguage] = useState('eng');
  const [languages, setLanguages] = useState<OcrLanguage[]>(FALLBACK_LANGUAGES);
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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
      setProgress(0);
      setLanguage('eng');
    },
  });

  // Ask the server which Tesseract language packs are actually installed.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/tools/ocr-pdf')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.languages?.length) return;
        setLanguages(data.languages as OcrLanguage[]);
        const first = (data.languages as OcrLanguage[]).find((l) => l.available);
        if (first) setLanguage((current) => (
          (data.languages as OcrLanguage[]).some((l) => l.code === current && l.available)
            ? current
            : first.code
        ));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
  }, []);

  const startProgress = () => {
    setProgress(4);
    if (progressTimer.current) clearInterval(progressTimer.current);
    // OCR has no server-side progress stream, so ease towards 95% while we wait.
    progressTimer.current = setInterval(() => {
      setProgress((current) => (current >= 95 ? 95 : current + Math.max(0.5, (95 - current) / 18)));
    }, 400);
  };

  const stopProgress = (complete: boolean) => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    setProgress(complete ? 100 : 0);
  };

  const handleFile = (selected: File | null) => {
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setError(null);
      setSuccess(false);
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

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    startProgress();

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('lang', language);

      const res = await fetch('/api/tools/ocr-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'OCR request failed');
      }

      const blob = await res.blob();
      stopProgress(true);
      setResult(URL.createObjectURL(blob));
      setSuccess(true);
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      stopProgress(false);
      setError(err instanceof Error ? err.message : 'Failed to process OCR request');
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
    link.download = `${(file?.name || 'document').replace(/\.pdf$/i, '')}-ocr.pdf`;
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

  const unavailableSelected = languages.some((l) => l.code === language && l.available === false);

  return (
    <ToolPageShell title="OCR PDF" description="Make scanned PDFs searchable and selectable." icon={Scan}>
      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={step} />
        <div key={step} className="animate-slide-up">

        {step === 'upload' && (
          <div className="space-y-6">
            <ToolCard>
              <div className="text-center mb-6">
                <h2 className="font-display font-bold text-xl text-brand-dark mb-2">
                  Upload Your Scanned PDF
                </h2>
                <p className="text-sm text-gray-500">
                  Select a scanned PDF to make it searchable
                </p>
              </div>

              {!file ? (
                <ToolUploadZone
                  icon={Upload}
                  title="Drop a PDF file here"
                  subtitle="or click to browse from your computer"
                  accept="application/pdf"
                  onFiles={(files) => handleFile(files?.[0] || null)}
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

        {step === 'options' && (
          <div className="space-y-6">
            <ToolCard>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-1">
                    OCR Settings
                  </h2>
                  <p className="text-sm text-gray-500">
                    Pick the document language and start recognition
                  </p>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  disabled={isProcessing}
                  className="text-xs font-semibold text-gray-500 hover:text-brand-red transition-colors cursor-pointer disabled:opacity-40"
                >
                  ← Back to Upload
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                  <div className="p-3 bg-white border border-gray-100 rounded-xl text-brand-red">
                    <Scan className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-dark truncate">
                      {file?.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatSize(file?.size || 0)}
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="ocr-language" className="block text-sm font-semibold text-gray-700 mb-2">
                    Document Language
                  </label>
                  <select
                    id="ocr-language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={isProcessing}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all disabled:opacity-60"
                  >
                    {languages.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label} ({option.code})
                        {option.available === false ? ' — not installed' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-2">
                    Tesseract uses this to choose the right recognition model.
                  </p>
                </div>

                {unavailableSelected && (
                  <ToolAlert type="error">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>This language pack is not installed on the server. Pick another language.</span>
                  </ToolAlert>
                )}

                <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    OCR runs page by page with Tesseract and adds an invisible text layer, so the
                    result stays visually identical but becomes searchable. Large scans can take
                    several minutes — keep this tab open. Pages that already contain text are
                    passed through untouched.
                  </p>
                </div>

                {isProcessing && (
                  <div aria-live="polite">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
                      <span>Running OCR…</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(progress)}
                      aria-label="OCR progress"
                      className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
                    >
                      <div
                        className="h-full bg-brand-red transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
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
              <ToolSecondaryButton onClick={() => setStep('upload')} disabled={isProcessing}>
                Back
              </ToolSecondaryButton>
              <ToolPrimaryButton onClick={handleProcess} loading={isProcessing} disabled={unavailableSelected}>
                {isProcessing ? (
                  <>
                    <Spinner size={24} color="#ffffff" className="shrink-0" />
                    <span>Running OCR...</span>
                  </>
                ) : (
                  <>
                    <Scan className="w-5 h-5 shrink-0" />
                    <span>Run OCR</span>
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
                Searchable PDF Ready!
              </h2>
              <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                A text layer was added to your document, so you can now search, select and copy its
                content.
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
                      <span>Download PDF</span>
                    </>
                  )}
                </ToolPrimaryButton>
                <ToolSecondaryButton onClick={resetAll} className="flex-1">
                  <Upload className="w-5 h-5 shrink-0" />
                  <span>Process Another</span>
                </ToolSecondaryButton>
              </div>
            </ToolCard>

            <RelatedTools currentTool="ocr-pdf" />
          </div>
        )}
      </div>
        </div>
    </ToolPageShell>
  );
}
