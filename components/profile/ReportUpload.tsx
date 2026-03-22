"use client";
import { useState, useRef } from "react";
import { Upload, FileText, Check, AlertCircle } from "lucide-react";

type Props = {
  onUploaded?: () => void;
};

export default function ReportUpload({ onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setStatus("error");
      setMessage("File too large (max 10MB)");
      return;
    }

    setUploading(true);
    setStatus("idle");
    setMessage("");

    try {
      // Read file as text (for PDFs, we'd need server-side parsing)
      const text = await file.text();

      // Send to ingest pipeline
      const res = await fetch("/api/ingest/from-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.slice(0, 50000), // cap at 50k chars
          defaults: {
            meta: {
              source_type: "upload",
              mime: file.type,
              fileName: file.name,
              fileTitle: file.name.replace(/\.[^.]+$/, ""),
            },
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Upload failed");

      setStatus("success");
      setMessage(`Extracted ${data.inserted || 0} items${data.labs ? `, ${data.labs} lab values` : ""}`);
      onUploaded?.();
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message || "Upload failed");
      console.error("Report upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.csv,.pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] p-4 text-sm text-[var(--so-text-secondary,#8E8E93)] transition hover:border-[var(--so-accent,#06B6D4)] hover:text-[var(--so-accent,#06B6D4)] disabled:opacity-50"
      >
        {uploading ? (
          <>
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" opacity="0.25" />
              <path d="M12 2a10 10 0 019.95 9" strokeLinecap="round" />
            </svg>
            Processing report2026
          </>
        ) : (
          <>
            <Upload className="h-5 w-5" />
            Upload blood test / medical report
          </>
        )}
      </button>

      {status === "success" && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          <Check className="h-4 w-4" />
          {message}
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="h-4 w-4" />
          {message}
        </div>
      )}
    </div>
  );
}
