"use client";

import { useState } from "react";
import { FileText, Upload, Download, AlertCircle } from "lucide-react";
import {
  ToolPageShell,
  ToolCard,
  ToolUploadZone,
  ToolPrimaryButton,
  ToolAlert,
} from "@/components/layout/ToolPageShell";

export default function ComparePDFPage() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<Array<{ type: "added" | "removed" | "unchanged"; text: string }> | null>(null);

  const handleFile1 = (selected: File | null) => {
    if (selected) {
      setFile1(selected);
      setError(null);
      setDiffResult(null);
    }
  };

  const handleFile2 = (selected: File | null) => {
    if (selected) {
      setFile2(selected);
      setError(null);
      setDiffResult(null);
    }
  };

  const handleProcess = async () => {
    if (!file1 || !file2) return;
    setIsProcessing(true);
    setError(null);
    setDiffResult(null);

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

      const res = await fetch("/api/tools/compare-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file1: readFiles[0], file2: readFiles[1] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Compare failed");

      setDiffResult(data.diff || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageShell title="Compare PDF" description="Compare two PDF files side by side." icon={FileText}>
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {!file1 && !file2 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ToolUploadZone
                icon={Upload}
                title="Upload First PDF"
                subtitle="Select the first PDF to compare"
                accept="application/pdf"
                onFiles={(files) => handleFile1(files?.[0] || null)}
              />
              <ToolUploadZone
                icon={Upload}
                title="Upload Second PDF"
                subtitle="Select the second PDF to compare"
                accept="application/pdf"
                onFiles={(files) => handleFile2(files?.[0] || null)}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <ToolCard>
                <h3 className="font-display font-semibold text-lg text-brand-dark mb-4">Selected Files</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Original</p>
                      <p className="text-xs text-gray-500">{file1?.name}</p>
                    </div>
                    <span className="text-xs text-gray-500">{(file1!.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Modified</p>
                      <p className="text-xs text-gray-500">{file2?.name}</p>
                    </div>
                    <span className="text-xs text-gray-500">{(file2!.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </div>
              </ToolCard>

              {diffResult && (
                <ToolCard>
                  <h3 className="font-display font-semibold text-lg text-brand-dark mb-4">Comparison Result</h3>
                  <div className="max-h-[500px] overflow-y-auto rounded-2xl border border-gray-100">
                    {diffResult.map((line, index) => (
                      <div
                        key={index}
                        className={`px-4 py-2 text-xs font-mono border-b border-gray-50 last:border-b-0 ${
                          line.type === 'added'
                            ? 'bg-green-50 text-green-700'
                            : line.type === 'removed'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-white text-gray-600'
                        }`}
                      >
                        <span className="inline-block w-8 text-gray-400 select-none">
                          {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                        </span>
                        {line.text || ' '}
                      </div>
                    ))}
                  </div>
                </ToolCard>
              )}
            </div>
          )}

          {error && (
            <ToolAlert type="error">
              <AlertCircle className="w-4 h-4" />
              {error}
            </ToolAlert>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-fit">
          <div>
            <h3 className="font-display font-semibold text-lg text-brand-dark mb-4">Options</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-6 font-sans">
              Compare two PDF files side by side.
            </p>
          </div>

          <ToolPrimaryButton onClick={handleProcess} disabled={!file1 || !file2} loading={isProcessing}>
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Compare PDF</span>
                <Download className="w-5 h-5 shrink-0" />
              </>
            )}
          </ToolPrimaryButton>
        </div>
      </div>
    </ToolPageShell>
  );
}
