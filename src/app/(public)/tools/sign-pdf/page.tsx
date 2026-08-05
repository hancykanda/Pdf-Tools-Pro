"use client";

import { useState } from "react";
import { FileText, Upload, Download, CheckCircle2, AlertCircle } from "lucide-react";
import {
  ToolPageShell,
  ToolCard,
  ToolUploadZone,
  ToolPrimaryButton,
    ToolSecondaryButton,
  ToolAlert,
} from "@/components/layout/ToolPageShell";

export default function SignPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [signatureText, setSignatureText] = useState("");
  const [position, setPosition] = useState("bottom-center");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resultData, setResultData] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const handleFile = (selected: File | null) => {
    if (selected) {
      setFile(selected);
      setError(null);
      setSuccess(false);
    setResultData(null);
    setCountdown(0);
    } else {
      setError("Please upload a file");
    }
  };

  const handleProcess = async () => {
    if (!file || !signatureText) return;
    setIsProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await fetch("/api/tools/sign-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: base64, text: signatureText, position }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Sign failed");

        setResultData(data.dataUrl);
        setSuccess(true);
        startCountdown();
      };
      reader.onerror = () => {
        setError("Failed to read file");
        setIsProcessing(false);
      };
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation failed");
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
    link.download = 'signed.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ToolPageShell title="Sign PDF" description="Add digital signatures to PDF documents." icon={FileText}>
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {!file ? (
            <ToolUploadZone
              icon={Upload}
              title="Click to upload or drag and drop a file"
              subtitle="Upload your file to get started"
              accept="*/*"
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
              Operation completed successfully!
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
            <h3 className="font-display font-semibold text-lg text-brand-dark mb-4">Options</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-6 font-sans">
              Add digital signatures to PDF documents.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Signature Text</label>
                <input
                  type="text"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-brand-red transition-colors"
                  placeholder="e.g. Approved by John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Position</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-brand-red transition-colors"
                >
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="top-left">Top Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-right">Top Right</option>
                </select>
              </div>
            </div>
          </div>

          <ToolPrimaryButton onClick={handleProcess} disabled={!file || !signatureText} loading={isProcessing}>
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Sign PDF</span>
                <Download className="w-5 h-5 shrink-0" />
              </>
            )}
          </ToolPrimaryButton>
        </div>
      </div>
    </ToolPageShell>
  );
}
