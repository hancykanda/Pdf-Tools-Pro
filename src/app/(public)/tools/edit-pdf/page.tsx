"use client";

import { useState } from "react";
import { FileText, Upload, Download, CheckCircle2, AlertCircle } from "lucide-react";
import {
  ToolPageShell,
  ToolCard,
  ToolUploadZone,
  ToolPrimaryButton,
  ToolAlert,
} from "@/components/layout/ToolPageShell";

export default function EditPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [overlayText, setOverlayText] = useState("Sample Text");
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const [fontSize, setFontSize] = useState(24);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFile = (selected: File | null) => {
    if (selected) {
      setFile(selected);
      setError(null);
      setSuccess(false);
    } else {
      setError("Please upload a file");
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });

      const res = await fetch("/api/tools/edit-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64, text: overlayText, x: posX, y: posY, fontSize }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Editing failed");

      const link = document.createElement("a");
      link.href = data.dataUrl;
      link.download = "edited.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to edit PDF");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageShell title="Edit PDF" description="Add text, images, and shapes to PDF documents." icon={FileText}>
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {!file ? (
            <ToolUploadZone
              icon={Upload}
              title="Click to upload or drag and drop a file"
              subtitle="Upload your file to get started"
              accept="application/pdf"
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
              PDF edited successfully! Your download should begin automatically.
            </ToolAlert>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-fit">
          <div>
            <h3 className="font-display font-semibold text-lg text-brand-dark mb-4">Options</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-6 font-sans">
              Add text, images, and shapes to PDF documents.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Overlay Text</label>
                <input
                  type="text"
                  value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  placeholder="Sample Text"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">X Position</label>
                  <input
                    type="number"
                    min="0"
                    value={posX}
                    onChange={(e) => setPosX(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Y Position</label>
                  <input
                    type="number"
                    min="0"
                    value={posY}
                    onChange={(e) => setPosY(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Font Size</label>
                <input
                  type="number"
                  min="8"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <ToolPrimaryButton onClick={handleProcess} disabled={!file} loading={isProcessing}>
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Edit PDF</span>
                <Download className="w-5 h-5 shrink-0" />
              </>
            )}
          </ToolPrimaryButton>
        </div>
      </div>
    </ToolPageShell>
  );
}
