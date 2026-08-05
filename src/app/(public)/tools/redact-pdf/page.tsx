"use client";

import { useState } from "react";
import { FileText, Upload, Download, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import {
  ToolPageShell,
  ToolCard,
  ToolUploadZone,
  ToolPrimaryButton,
    ToolSecondaryButton,
  ToolAlert,
} from "@/components/layout/ToolPageShell";

interface Region {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function RedactPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [page, setPage] = useState(1);
  const [x, setX] = useState(100);
  const [y, setY] = useState(100);
  const [width, setWidth] = useState(200);
  const [height, setHeight] = useState(30);
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

  const addRegion = () => {
    setRegions((prev) => [...prev, { page, x, y, width, height }]);
    setPage(1);
    setX(100);
    setY(100);
    setWidth(200);
    setHeight(30);
  };

  const removeRegion = (index: number) => {
    setRegions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (!file || regions.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await fetch("/api/tools/redact-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: base64, regions }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Redact failed");

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
    link.download = 'redacted.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ToolPageShell title="Redact PDF" description="Permanently remove sensitive text from PDFs." icon={FileText}>
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

          {regions.length > 0 && (
            <ToolCard>
              <h3 className="font-display font-semibold text-lg text-brand-dark mb-4">Redaction Regions ({regions.length})</h3>
              <div className="flex flex-col gap-2">
                {regions.map((region, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                    <span className="text-xs text-gray-600">
                      Page {region.page}: x={region.x}, y={region.y}, w={region.width}, h={region.height}
                    </span>
                    <button
                      onClick={() => removeRegion(index)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-white rounded-lg border border-transparent cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </ToolCard>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-fit">
          <div>
            <h3 className="font-display font-semibold text-lg text-brand-dark mb-4">Options</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-6 font-sans">
              Permanently remove sensitive text from PDFs.
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Page</label>
                  <input
                    type="number"
                    min={1}
                    value={page}
                    onChange={(e) => setPage(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-brand-red transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">X</label>
                  <input
                    type="number"
                    value={x}
                    onChange={(e) => setX(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-brand-red transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Y</label>
                  <input
                    type="number"
                    value={y}
                    onChange={(e) => setY(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-brand-red transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Width</label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-brand-red transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Height</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-brand-red transition-colors"
                  />
                </div>
              </div>
              <ToolPrimaryButton onClick={addRegion} disabled={!file} className="!bg-gray-700 hover:!bg-gray-800">
                Add Region
              </ToolPrimaryButton>
            </div>
          </div>

          <ToolPrimaryButton onClick={handleProcess} disabled={!file || regions.length === 0} loading={isProcessing}>
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Redact PDF</span>
                <Download className="w-5 h-5 shrink-0" />
              </>
            )}
          </ToolPrimaryButton>
        </div>
      </div>
    </ToolPageShell>
  );
}
