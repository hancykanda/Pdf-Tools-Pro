'use client';

import { useState } from 'react';
import { GitCompare, Upload, Download, CheckCircle2, AlertCircle, Info } from 'lucide-react';
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

export default function ComparePDFPage() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [diffResult, setDiffResult] = useState<Array<{ type: 'added' | 'removed' | 'unchanged'; text: string }> | null>(null);
  const {
    step,
    setStep,
                    isProcessing,
    setIsProcessing,
    error,
    setError,
        setSuccess,
    goToOptions,
    goToDownload,
    resetAll,
  } = useToolState<Record<string, unknown>>();

  const handleFile1 = (selected: FileList | null) => {
    const picked = selected?.[0] || null;
    if (picked && picked.type === 'application/pdf') {
      setFile1(picked);
      setError(null);
      setSuccess(false);
      setDiffResult(null);
    } else {
      setError('Please upload a valid PDF file for the first document');
    }
  };

  const handleFile2 = (selected: FileList | null) => {
    const picked = selected?.[0] || null;
    if (picked && picked.type === 'application/pdf') {
      setFile2(picked);
      setError(null);
      setSuccess(false);
      setDiffResult(null);
    } else {
      setError('Please upload a valid PDF file for the second document');
    }
  };

  const handleContinueToOptions = () => {
    if (!file1 || !file2) {
      setError('Please upload both PDF files to compare');
      return;
    }
    setError(null);
    goToOptions();
  };

  const handleCompare = async () => {
    if (!file1 || !file2) return;
    setIsProcessing(true);
    setError(null);

    try {
      const readFiles = await Promise.all([
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file1);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        }),
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file2);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        }),
      ]);

      const res = await fetch('/api/tools/compare-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file1: readFiles[0], file2: readFiles[1] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Compare failed');

      setDiffResult(data.diff || []);
      setSuccess(true);
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes: string[] = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ToolPageShell title="Compare PDF" description="Find differences between two PDF documents." icon={GitCompare}>
      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={step} />

        {step === 'upload' && (
          <div className="space-y-6">
            <ToolCard>
              <div className="text-center mb-6">
                <h2 className="font-display font-bold text-xl text-brand-dark mb-2">
                  Upload Two PDFs to Compare
                </h2>
                <p className="text-sm text-gray-500">
                  Select the original and modified PDF documents
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Original PDF</h3>
                  {!file1 ? (
                    <ToolUploadZone
                      icon={Upload}
                      title="Drop original PDF"
                      subtitle="or click to browse"
                      accept="application/pdf"
                      onFiles={handleFile1}
                    />
                  ) : (
                    <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-green-700 truncate">
                            {file1.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatSize(file1.size)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Modified PDF</h3>
                  {!file2 ? (
                    <ToolUploadZone
                      icon={Upload}
                      title="Drop modified PDF"
                      subtitle="or click to browse"
                      accept="application/pdf"
                      onFiles={handleFile2}
                    />
                  ) : (
                    <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-green-700 truncate">
                            {file2.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatSize(file2.size)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
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

            <div className="flex justify-end">
              <ToolPrimaryButton
                onClick={handleContinueToOptions}
                disabled={!file1 || !file2}
                className="min-w-[160px]"
              >
                Continue to Compare
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
                    Compare Settings
                  </h2>
                  <p className="text-sm text-gray-500">
                    Review your files and start comparison
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                    <div className="p-3 bg-white border border-gray-100 rounded-xl text-brand-red">
                      <GitCompare className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-0.5">Original</p>
                      <p className="text-sm font-semibold text-brand-dark truncate">
                        {file1?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatSize(file1?.size || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                    <div className="p-3 bg-white border border-gray-100 rounded-xl text-brand-red">
                      <GitCompare className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-0.5">Modified</p>
                      <p className="text-sm font-semibold text-brand-dark truncate">
                        {file2?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatSize(file2?.size || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    The comparison will identify added, removed, and unchanged content between the two PDFs. Results will be displayed below.
                  </p>
                </div>
              </div>
            </ToolCard>

            <div className="flex justify-end gap-3">
              <ToolSecondaryButton onClick={() => setStep('upload')}>
                Back
              </ToolSecondaryButton>
              <ToolPrimaryButton onClick={handleCompare} loading={isProcessing}>
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Comparing...</span>
                  </>
                ) : (
                  <>
                    <GitCompare className="w-5 h-5 shrink-0" />
                    <span>Compare PDFs</span>
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
                Comparison Complete!
              </h2>
              <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                The differences between your PDFs have been analyzed. View the results below.
              </p>

              {diffResult && diffResult.length > 0 && (
                <div className="text-left max-w-2xl mx-auto mb-8">
                  <h3 className="font-display font-semibold text-lg text-brand-dark mb-3">
                    Comparison Results
                  </h3>
                  <div className="bg-gray-50 rounded-2xl p-4 max-h-96 overflow-y-auto">
                    {diffResult.map((item, index) => (
                      <div
                        key={index}
                        className={`text-sm font-mono py-1 px-2 rounded ${
                          item.type === 'added'
                            ? 'bg-green-50 text-green-700'
                            : item.type === 'removed'
                            ? 'bg-red-50 text-red-700'
                            : 'text-gray-600'
                        }`}
                      >
                        <span className="text-xs uppercase font-bold mr-2">
                          {item.type === 'added' ? '+' : item.type === 'removed' ? '-' : ' '}
                        </span>
                        {item.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
                <ToolSecondaryButton onClick={resetAll} className="flex-1">
                  <Upload className="w-5 h-5 shrink-0" />
                  <span>Compare Another</span>
                </ToolSecondaryButton>
              </div>
            </ToolCard>

            <RelatedTools currentTool="compare-pdf" />
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
