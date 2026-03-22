"use client";
import { useState } from "react";
import { FileText } from "lucide-react";

export default function HealthReportExport() {
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/health-report/pdf", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `health-report-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={generate}
      disabled={generating}
      className="flex items-center gap-2 rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] px-4 py-2.5 text-sm font-medium text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] transition hover:bg-[rgba(6,182,212,0.05)] disabled:opacity-40"
    >
      <FileText className="h-4 w-4 text-[var(--so-accent,#06B6D4)]" />
      {generating ? "Generating\u2026" : "Export Health Report"}
    </button>
  );
}
