'use client';

import { useState } from 'react';
import { FileText, Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  ToolPageShell,
  ToolCard,
  ToolUploadZone,
  ToolPrimaryButton,
    ToolSecondaryButton,
  ToolAlert,
} from '@/components/layout/ToolPageShell';

export default function ExceltoPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resultData, setResultData] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const handleFile = (selected: File | null) => {
    if (selected && (selected.name.endsWith('.xls') || selected.name.endsWith('.xlsx') || selected.name.endsWith('.csv'))) {
      setFile(selected);
      setError(null);
      setSuccess(false);
    setResultData(null);
    setCountdown(0);
    } else {
      setError('Please upload a valid Excel file (.xls, .xlsx, or .csv)');
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/tools/excel-to-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Conversion failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setResultData(url);
      setSuccess(true);
      startCountdown();;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to convert Excel to PDF');
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
    if (!resultData || countdown > 0) return;
    const link = document.createElement('a');
    link.href = resultData;
    link.download = 'converted.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ToolPageShell title="Excel to PDF" description="Convert Excel spreadsheets to PDF format." icon={FileText}>
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {!file ? (
            <ToolUploadZone
              icon={Upload}
              title="Click to upload or drag and drop an Excel file"
              subtitle="Supports .xls, .xlsx, and .csv files"
              accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onFiles={(files) => handleFile(files?.[0] || null)}
            />
          ) : (
            <ToolCard>
              <h3 className="font-display font-semibold text-lg text-brand-dark mb-4">Selected File</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <span className="text-sm font-medium text-gray-700">{file.name}</span>
                <span className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            </ToolCard>
          )}

          {error && (
            <ToolAlert type="error">
              <AlertCircle className="w-4 h-4" />
              {error}
            </ToolAlert>
          )}

          {success && (
            <ToolAlert type="success">
              <CheckCircle2 className="w-4 h-4" />
              Excel converted to PDF successfully!
            </ToolAlert>
          )}
          {success && resultData && (
            <ToolCard>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-lg text-brand-dark">Result</h3>
                <ToolSecondaryButton onClick={handleDownload} className="!w-auto" disabled={countdown > 0}>
                  <Download className="w-4 h-4" />
                  {countdown > 0 ? `Wait ${countdown}s` : 'Download'}
                </ToolSecondaryButton>
              </div>
            </ToolCard>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-fit">
          <div>
            <h3 className="font-display font-semibold text-lg text-brand-dark mb-4">Conversion Options</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-6 font-sans">
              Convert your Excel spreadsheet to PDF format. The conversion preserves cell formatting and layout.
            </p>
          </div>

          <ToolPrimaryButton onClick={handleProcess} disabled={!file} loading={isProcessing}>
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Converting...</span>
              </>
            ) : (
              <>
                <span>Convert to PDF</span>
                <Download className="w-5 h-5 shrink-0" />
              </>
            )}
          </ToolPrimaryButton>
        </div>
      </div>
    </ToolPageShell>
  );
}
