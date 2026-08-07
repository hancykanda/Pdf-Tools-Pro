'use client';

import { useState } from 'react';
import { Globe, Upload, Download, CheckCircle2, AlertCircle, Info, Link2, Code } from 'lucide-react';
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

type SourceMode = 'url' | 'file';

const PAGE_SIZE_OPTIONS = [
  { value: 'a4', label: 'A4 (210 × 297 mm)' },
  { value: 'letter', label: 'US Letter (8.5 × 11 in)' },
  { value: 'legal', label: 'US Legal (8.5 × 14 in)' },
  { value: 'a3', label: 'A3 (297 × 420 mm)' },
  { value: 'a5', label: 'A5 (148 × 210 mm)' },
  { value: 'tabloid', label: 'Tabloid (11 × 17 in)' },
];

const MARGIN_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'small', label: 'Small (10 mm)' },
  { value: 'default', label: 'Default (15–20 mm)' },
  { value: 'large', label: 'Large (25–30 mm)' },
];

export default function HTMLtoPDFPage() {
  const [mode, setMode] = useState<SourceMode>('url');
  const [url, setUrl] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [pageSize, setPageSize] = useState('a4');
  const [orientation, setOrientation] = useState('portrait');
  const [margin, setMargin] = useState('default');
  const [printBackground, setPrintBackground] = useState(true);

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

  const handleFile = (selected: File | null) => {
    if (!selected) return;
    if (!/\.(html?|xhtml)$/i.test(selected.name) && !selected.type.includes('html')) {
      setError('Please upload an HTML file (.html or .htm)');
      return;
    }
    setFile(selected);
    setError(null);
    setSuccess(false);
    const reader = new FileReader();
    reader.onload = (e) => setHtmlContent((e.target?.result as string) || '');
    reader.onerror = () => setError('Could not read that file. Please try another one.');
    reader.readAsText(selected);
  };

  const handleContinueToOptions = () => {
    if (mode === 'url') {
      if (!url.trim()) {
        setError('Please enter the address of the page you want to convert');
        return;
      }
      try {
        const parsed = new URL(url.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          setError('Only http:// and https:// URLs are supported');
          return;
        }
      } catch {
        setError('Please enter a valid URL, including http:// or https://');
        return;
      }
    } else if (!htmlContent.trim()) {
      setError('Please upload an HTML file or paste HTML content');
      return;
    }

    setError(null);
    goToOptions();
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const payload =
        mode === 'url'
          ? { mode: 'url', url: url.trim() }
          : { mode: 'html', html: htmlContent };

      const res = await fetch('/api/tools/html-to-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          pageSize,
          orientation,
          margin,
          printBackground: String(printBackground),
        }),
      });

      // The API streams back a binary PDF; only error payloads are JSON.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Conversion failed');
      }

      const blob = await res.blob();
      setResult(URL.createObjectURL(blob));
      setSuccess(true);
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to convert HTML to PDF');
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
    link.download = mode === 'url' ? 'webpage.pdf' : 'converted.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setUrl('');
    setHtmlContent('');
    setPageSize('a4');
    setOrientation('portrait');
    setMargin('default');
    setPrintBackground(true);
    resetAll();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes: string[] = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const switchMode = (next: SourceMode) => {
    setMode(next);
    setError(null);
    setSuccess(false);
    setResult(null);
    setCountdown(0);
  };

  return (
    <ToolPageShell
      title="HTML to PDF"
      description="Convert any web page or HTML file to a pixel-accurate PDF."
      icon={Globe}
    >
      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={step} />
        <ProcessingModal open={isProcessing} />
        <div key={step} className="animate-slide-up">

        {step === 'upload' && (
          <div className="space-y-6">
            <ToolCard>
              <div className="text-center mb-6">
                <h2 className="font-display font-bold text-xl text-brand-dark mb-2">
                  Choose Your Source
                </h2>
                <p className="text-sm text-gray-500">
                  Convert a live web page by URL, or upload an HTML file
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 border border-gray-100 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => switchMode('url')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    mode === 'url'
                      ? 'bg-white text-brand-dark shadow-sm border border-gray-100'
                      : 'text-gray-500 hover:text-brand-dark'
                  }`}
                >
                  <Link2 className="w-4 h-4" />
                  From URL
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('file')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    mode === 'file'
                      ? 'bg-white text-brand-dark shadow-sm border border-gray-100'
                      : 'text-gray-500 hover:text-brand-dark'
                  }`}
                >
                  <Code className="w-4 h-4" />
                  HTML File
                </button>
              </div>

              {mode === 'url' ? (
                <div className="space-y-3">
                  <label htmlFor="page-url" className="block text-sm font-semibold text-gray-700">
                    Web Page Address
                  </label>
                  <input
                    id="page-url"
                    type="url"
                    inputMode="url"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setError(null);
                    }}
                    placeholder="https://example.com/article"
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
                  />
                  <p className="text-xs text-gray-400">
                    The page is loaded in a real headless Chromium browser, so CSS, images and web
                    fonts are rendered exactly as in a browser.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Upload HTML File</h3>
                    {!file ? (
                      <ToolUploadZone
                        icon={Upload}
                        title="Drop an HTML file here"
                        subtitle="or click to browse (.html, .htm)"
                        accept=".html,.htm,text/html"
                        onFiles={(files) => handleFile(files?.[0] || null)}
                      />
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-semibold text-green-700">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
                          <button
                            onClick={() => {
                              setFile(null);
                              setHtmlContent('');
                            }}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-3 text-gray-500">Or paste HTML below</span>
                    </div>
                  </div>

                  <textarea
                    value={htmlContent}
                    onChange={(e) => {
                      setHtmlContent(e.target.value);
                      setFile(null);
                      setSuccess(false);
                      setResult(null);
                      setCountdown(0);
                    }}
                    placeholder="<html>…</html>"
                    className="w-full h-48 p-4 border border-gray-200 rounded-2xl text-sm text-gray-700 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
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
              <ToolPrimaryButton onClick={handleContinueToOptions} className="min-w-[160px]">
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
                    Page Setup
                  </h2>
                  <p className="text-sm text-gray-500">Choose the paper size and margins</p>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  className="text-xs font-semibold text-gray-500 hover:text-brand-red transition-colors cursor-pointer"
                >
                  ← Back to Source
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                  <div className="p-3 bg-white border border-gray-100 rounded-xl text-brand-red">
                    {mode === 'url' ? <Link2 className="w-6 h-6" /> : <Code className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">
                      {mode === 'url' ? 'Web page' : file ? 'HTML file' : 'Pasted HTML'}
                    </p>
                    <p className="text-sm font-semibold text-brand-dark truncate">
                      {mode === 'url'
                        ? url
                        : file
                          ? file.name
                          : `${htmlContent.length.toLocaleString()} characters`}
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="page-size"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Page Size
                    </label>
                    <select
                      id="page-size"
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="orientation"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Orientation
                    </label>
                    <select
                      id="orientation"
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="margin" className="block text-sm font-semibold text-gray-700 mb-2">
                    Margins
                  </label>
                  <select
                    id="margin"
                    value={margin}
                    onChange={(e) => setMargin(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
                  >
                    {MARGIN_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printBackground}
                    onChange={(e) => setPrintBackground(e.target.checked)}
                    className="w-4 h-4 accent-brand-red cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">
                    Print background colours and images
                  </span>
                </label>

                <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Rendering runs in headless Chromium, so scripts, web fonts and CSS layouts are
                    honoured. Large pages can take a few seconds.
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
              <ToolPrimaryButton onClick={handleProcess} loading={isProcessing}>
                {isProcessing ? (
                  <>
                    <Spinner size={24} color="#ffffff" className="shrink-0" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-5 h-5 shrink-0" />
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
                HTML Converted Successfully!
              </h2>
              <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                Your page has been rendered to PDF. Download your file below.
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
                <ToolSecondaryButton onClick={handleReset} className="flex-1">
                  <Upload className="w-5 h-5 shrink-0" />
                  <span>Convert Another</span>
                </ToolSecondaryButton>
              </div>
            </ToolCard>

            <RelatedTools currentTool="html-to-pdf" />
          </div>
        )}
      </div>
        </div>
    </ToolPageShell>
  );
}
