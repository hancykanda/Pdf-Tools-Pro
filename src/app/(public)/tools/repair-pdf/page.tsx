'use client';

import { useState } from 'react';
import { Wrench, Upload, Download, CheckCircle2, AlertCircle, Info } from 'lucide-react';
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

export default function RepairPdfPage() {
  const [repairMethod, setRepairMethod] = useState<string | null>(null);
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
    onReset: () => setRepairMethod(null),
  });

  const handleFile = (selected: FileList | null) => {
    const selectedFile = selected?.[0] || null;
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
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
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/tools/repair-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Repair failed');
      }

      const blob = await res.blob();
      setRepairMethod(res.headers.get('X-Repair-Method'));
      setResult(URL.createObjectURL(blob));
      setSuccess(true);
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to repair PDF');
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
    if (!result || countdown > 0) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `${(file?.name || 'document').replace(/\.pdf$/i, '')}-repaired.pdf`;
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
    <ToolPageShell title="Repair PDF" description="Fix corrupted or damaged PDF files." icon={Wrench}>
      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={step} />
        <ProcessingModal
          open={isProcessing}
          message="Repairing your PDF..."
          submessage="Rebuilding the document structure. Keep this tab open."
        />
        <div key={step} className="animate-slide-up">

        {step === 'upload' && (
          <div className="space-y-6">
            <ToolCard>
              <div className="text-center mb-6">
                <h2 className="font-display font-bold text-xl text-brand-dark mb-2">Upload Your File</h2>
                <p className="text-sm text-gray-500">Select a file to get started</p>
              </div>
              {!file ? (
                <ToolUploadZone icon={Upload} title="Drop a file here" subtitle="or click to browse" accept="application/pdf" onFiles={handleFile} />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-700">{file.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
                  </div>
                  <button onClick={() => { setFile(null); setError(null); }} className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer">Remove</button>
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
                Continue to Options <Download className="w-4 h-4" />
              </ToolPrimaryButton>
            </div>
          </div>
        )}

        {step === 'options' && (
          <div className="space-y-6">
            <ToolCard>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-1">Repair Settings</h2>
                  <p className="text-sm text-gray-500">Review your file and start processing</p>
                </div>
                <button onClick={() => setStep('upload')} className="text-xs font-semibold text-gray-500 hover:text-brand-red transition-colors cursor-pointer">← Back to Upload</button>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                <div className="p-3 bg-white border border-gray-100 rounded-xl text-brand-red"><Wrench className="w-6 h-6" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-brand-dark truncate">{file?.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatSize(file?.size || 0)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl mt-4">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  No options needed. Your PDF is rebuilt from scratch with Ghostscript (qpdf is used
                  as a fallback), which repairs broken cross-reference tables and damaged objects.
                </p>
              </div>
            </ToolCard>
            <div className="flex justify-end gap-3">
              <ToolSecondaryButton onClick={() => setStep('upload')}>Back</ToolSecondaryButton>
              <ToolPrimaryButton onClick={handleProcess} loading={isProcessing}>
                {isProcessing ? (<><Spinner size={24} color="#ffffff" className="shrink-0" /><span>Processing...</span></>) : (<><Wrench className="w-5 h-5 shrink-0" /><span>Repair PDF</span></>)}
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
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark mb-3">PDF Repaired Successfully!</h2>
              <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">Your PDF was rebuilt{repairMethod ? ` with ${repairMethod === 'qpdf' ? 'qpdf' : 'Ghostscript'}` : ''} and is ready for download.</p>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
                <ToolPrimaryButton onClick={handleDownload} disabled={countdown > 0} className="flex-1">
                  {countdown > 0 ? (<><Spinner size={24} color="#ffffff" className="shrink-0" /><span>Please wait {countdown}s...</span></>) : (<><Download className="w-5 h-5 shrink-0" /><span>Download PDF</span></>)}
                </ToolPrimaryButton>
                <ToolSecondaryButton onClick={resetAll} className="flex-1">
                  <Upload className="w-5 h-5 shrink-0" />
                  <span>Process Another</span>
                </ToolSecondaryButton>
              </div>
            </ToolCard>
            <RelatedTools currentTool="repair-pdf" />
          </div>
        )}
      </div>
        </div>
    </ToolPageShell>
  );
}
