"use client";
import { useEffect, useState } from "react";
import { Activity, Heart, Droplets, Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";

type VitalTrend = { date: string; value: number };
type HealthData = {
  score: number | null;
  bp: VitalTrend[];
  hr: VitalTrend[];
  bmi: VitalTrend[];
  hba1c: VitalTrend[];
  hemoglobin: VitalTrend[];
  mood: VitalTrend[];
  predictions: string[];
};

function ScoreRing({ score, size = 120, label }: { score: number; size?: number; label: string }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "#34C759" : score >= 40 ? "#FF9500" : "#FF3B30";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--so-border, #E5E5EA)" strokeWidth="8" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            className="transition-all duration-1000" />
        </svg>
        <span className="absolute text-2xl font-bold" style={{ color }}>{score}</span>
      </div>
      <span className="text-xs font-medium text-[var(--so-text-secondary,#8E8E93)]">{label}</span>
    </div>
  );
}

function MiniChart({ data, color, label, unit }: { data: VitalTrend[]; color: string; label: string; unit: string }) {
  if (!data.length) return null;
  const latest = data[0];
  const prev = data.length > 1 ? data[1] : null;
  const trend = prev ? (latest.value > prev.value ? "up" : latest.value < prev.value ? "down" : "flat") : "flat";
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  // Simple sparkline
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  const points = data.slice(0, 10).reverse().map((d, i) => {
    const x = (i / Math.max(data.slice(0, 10).length - 1, 1)) * 100;
    const y = 40 - ((d.value - min) / range) * 36;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--so-text-secondary,#8E8E93)]">{label}</span>
        <TrendIcon className="h-3.5 w-3.5" style={{ color: trend === "up" ? "#FF3B30" : trend === "down" ? "#34C759" : "#8E8E93" }} />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold" style={{ color }}>{latest.value}</span>
        <span className="text-xs text-[var(--so-text-secondary,#8E8E93)] mb-1">{unit}</span>
      </div>
      <svg viewBox="0 0 100 44" className="mt-2 w-full h-8" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-[10px] text-[var(--so-text-secondary,#8E8E93)] mt-1">
        {latest.date ? new Date(latest.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Latest"}
      </p>
    </div>
  );
}

export default function HealthAnalytics() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, scoreRes] = await Promise.all([
          fetch("/api/profile", { credentials: "include" }).then(r => r.json()),
          fetch("/api/health-score?userId=me", { credentials: "include" }).then(r => r.json()).catch(() => null),
        ]);

        // Extract vital trends from observations
        const groups = profileRes?.groups || {};
        const buildTrend = (items: any[]): VitalTrend[] =>
          (items || []).filter((i: any) => i.value != null && !isNaN(Number(i.value)))
            .map((i: any) => ({ date: i.observedAt, value: Number(i.value) }));

        setData({
          score: scoreRes?.overall_score ?? null,
          bp: buildTrend(groups.vitals?.filter((v: any) => v.key === "bp_systolic" || v.key === "bp") || []),
          hr: buildTrend(groups.vitals?.filter((v: any) => v.key === "heart_rate" || v.key === "hr") || []),
          bmi: buildTrend(groups.vitals?.filter((v: any) => v.key === "bmi") || []),
          hba1c: buildTrend(groups.labs?.filter((l: any) => l.key === "hba1c") || []),
          hemoglobin: buildTrend(groups.labs?.filter((l: any) => l.key === "hemoglobin") || []),
          mood: [], // from daily_checkins
          predictions: scoreRes?.recommendations || [],
        });
      } catch (err) {
        console.error("Health analytics load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[1,2,3].map(i => (
          <div key={i} className="animate-pulse rounded-2xl bg-[var(--so-border,#E5E5EA)] dark:bg-[var(--so-border,#2C2C2E)] h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Health Score Ring */}
      <div className="flex flex-col items-center py-6">
        {data?.score != null ? (
          <ScoreRing score={data.score} size={140} label="Overall Health Score" />
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-4 border-[var(--so-border,#E5E5EA)]">
              <Activity className="h-8 w-8 text-[var(--so-text-secondary,#8E8E93)]" />
            </div>
            <p className="text-sm text-[var(--so-text-secondary,#8E8E93)]">Upload a report or add vitals to see your health score</p>
          </div>
        )}
      </div>

      {/* Vital Charts Grid */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-3 px-1">Vitals Trends</h2>
        <div className="grid grid-cols-2 gap-3">
          <MiniChart data={data?.bp || []} color="#EF4444" label="Blood Pressure" unit="mmHg" />
          <MiniChart data={data?.hr || []} color="#8B5CF6" label="Heart Rate" unit="bpm" />
          <MiniChart data={data?.bmi || []} color="#06B6D4" label="BMI" unit="kg/m\u00B2" />
          <MiniChart data={data?.hemoglobin || []} color="#EC4899" label="Hemoglobin" unit="g/dL" />
        </div>
      </div>

      {/* Lab Trends */}
      {(data?.hba1c?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-3 px-1">Lab Trends</h2>
          <div className="grid grid-cols-2 gap-3">
            <MiniChart data={data?.hba1c || []} color="#F59E0B" label="HbA1c" unit="%" />
          </div>
        </div>
      )}

      {/* AI Predictions */}
      {(data?.predictions?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-3 px-1">
            <Brain className="h-4 w-4 inline mr-1.5 text-[var(--so-accent,#06B6D4)]" />
            AI Predictions
          </h2>
          <div className="space-y-2">
            {data.predictions.slice(0, 5).map((p: string, i: number) => (
              <div key={i} className="rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] px-4 py-3 text-xs text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">
                {typeof p === "string" ? p : JSON.stringify(p)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
