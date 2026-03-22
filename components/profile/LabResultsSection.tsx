"use client";
import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";

type LabResult = { test: string; value: number; unit: string; date: string; status: "normal" | "high" | "low" };

export default function LabResultsSection() {
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const items = d?.groups?.labs || [];
        setLabs(items.map((l: any) => ({
          test: l.label || l.key,
          value: l.value,
          unit: l.unit || "",
          date: l.observedAt?.split("T")[0] || "",
          status: "normal" as const,
        })));
      })
      .catch(err => console.error('Failed to load labs:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 rounded-lg bg-[var(--so-border,#E5E5EA)]" />)}</div>;
  if (!labs.length) return <p className="text-xs text-[var(--so-text-secondary,#8E8E93)] text-center py-3">No lab results yet. Upload a blood test report to see results here.</p>;

  return (
    <div className="space-y-1.5">
      {labs.slice(0, 15).map((l, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] px-3 py-2">
          <div>
            <p className="text-xs font-medium text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">{l.test}</p>
            <p className="text-[10px] text-[var(--so-text-secondary,#8E8E93)]">{l.date}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">
              {l.value}{l.unit ? ` ${l.unit}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
