"use client";
import { useEffect, useState } from "react";

type TimelineItem = {
  id: string;
  kind: string;
  value_text: string | null;
  value_num: number | null;
  unit: string | null;
  observed_at: string;
  meta: any;
};

const KIND_COLORS: Record<string, string> = {
  bp_systolic: "#EF4444",
  bp_diastolic: "#F97316",
  heart_rate: "#8B5CF6",
  bmi: "#06B6D4",
  hemoglobin: "#EC4899",
  hba1c: "#F59E0B",
  medication: "#10B981",
  note: "#6B7280",
  lab: "#3B82F6",
  symptom: "#EF4444",
};

const KIND_LABELS: Record<string, string> = {
  bp_systolic: "BP Systolic",
  bp_diastolic: "BP Diastolic",
  heart_rate: "Heart Rate",
  bmi: "BMI",
  hemoglobin: "Hemoglobin",
  hba1c: "HbA1c",
  medication: "Medication",
  note: "Note",
  lab: "Lab Result",
  symptom: "Symptom",
};

export default function HealthTimeline() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/timeline?limit=30", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : [];
        setItems(list);
      })
      .catch(err => console.error("Timeline fetch failed:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="h-3 w-3 rounded-full bg-[var(--so-border,#E5E5EA)]" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-1/3 rounded bg-[var(--so-border,#E5E5EA)]" />
              <div className="h-3 w-2/3 rounded bg-[var(--so-border,#E5E5EA)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="p-4 text-center text-xs text-[var(--so-text-secondary,#8E8E93)]">
        No health events yet. Chat or upload a report to get started.
      </div>
    );
  }

  return (
    <div className="space-y-0.5 p-3">
      {items.map((item, i) => {
        const color = KIND_COLORS[item.kind] || "#6B7280";
        const label = KIND_LABELS[item.kind] || item.kind;
        const date = new Date(item.observed_at);
        const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        const display = item.value_num != null
          ? `${item.value_num}${item.unit ? ` ${item.unit}` : ""}`
          : item.value_text || item.meta?.summary || label;

        return (
          <div key={item.id || i} className="flex items-start gap-3 py-1.5">
            <div className="flex flex-col items-center">
              <div className="h-2.5 w-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: color }} />
              {i < items.length - 1 && <div className="w-px flex-1 bg-[var(--so-border,#E5E5EA)] dark:bg-[var(--so-border,#2C2C2E)]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] truncate">{display}</span>
                <span className="text-[10px] text-[var(--so-text-secondary,#8E8E93)] shrink-0">{dateStr}</span>
              </div>
              <span className="text-[10px] text-[var(--so-text-secondary,#8E8E93)]">{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
