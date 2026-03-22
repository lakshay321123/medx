"use client";
import { useEffect, useState } from "react";

type ScoreData = {
  overall_score: number;
  labs_score: number | null;
  vitals_score: number | null;
  activity_score: number | null;
  adherence_score: number | null;
  mental_score: number | null;
  recommendations: string[];
  streak_days: number;
};

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "#34C759" : score >= 40 ? "#FF9500" : "#FF3B30";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--so-border, #E5E5EA)" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-1000" />
      </svg>
      <span className="absolute text-lg font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

export default function HealthScoreCard() {
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    fetch("/api/health-score?userId=me", { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d?.overall_score != null) setData(d); })
      .catch((err) => console.error('Health score fetch failed:', err))
      .finally(() => setLoading(false));
  }, []);

  const compute = async () => {
    setComputing(true);
    try {
      const r = await fetch("/api/health-score?userId=me&compute=1", { credentials: "include" });
      const d = await r.json();
      if (d?.overall_score != null) setData(d);
    } catch (err) {
      console.error('Health score compute failed:', err);
    } finally {
      setComputing(false);
    }
  };

  if (loading) return null;

  if (!data) {
    return (
      <div className="rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] p-4">
        <h3 className="text-sm font-semibold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-2">Health Score</h3>
        <p className="text-xs text-[var(--so-text-secondary,#8E8E93)] mb-3">
          Add your medical profile data to generate your health score.
        </p>
        <button
          type="button"
          onClick={compute}
          disabled={computing}
          className="w-full rounded-xl bg-[var(--so-accent,#06B6D4)] py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          {computing ? "Computing\u2026" : "Generate Score"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] p-4">
      <div className="flex items-center gap-4">
        <ScoreRing score={data.overall_score} />
        <div>
          <h3 className="text-sm font-semibold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">Health Score</h3>
          {data.streak_days > 0 && (
            <p className="text-xs text-[var(--so-accent,#06B6D4)]">{data.streak_days} day streak</p>
          )}
        </div>
      </div>
      {data.recommendations?.length > 0 && (
        <div className="mt-3 space-y-1">
          {data.recommendations.slice(0, 3).map((r, i) => (
            <p key={i} className="text-xs text-[var(--so-text-secondary,#8E8E93)]">{r}</p>
          ))}
        </div>
      )}
    </div>
  );
}
