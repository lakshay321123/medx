"use client";
import { useState, useCallback } from "react";

const MOODS = [
  { emoji: "\uD83D\uDE1E", label: "Bad", value: 1 },
  { emoji: "\uD83D\uDE15", label: "Low", value: 2 },
  { emoji: "\uD83D\uDE10", label: "Okay", value: 3 },
  { emoji: "\uD83D\uDE42", label: "Good", value: 4 },
  { emoji: "\uD83D\uDE04", label: "Great", value: 5 },
];

export default function DailyCheckin({ onDone }: { onDone?: () => void }) {
  const [mood, setMood] = useState<number | null>(null);
  const [sleep, setSleep] = useState("");
  const [energy, setEnergy] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = useCallback(async () => {
    if (!mood) return;
    setSaving(true);
    try {
      await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood,
          energy,
          sleep_hours: sleep ? parseFloat(sleep) : null,
        }),
      });
      setSaved(true);
      localStorage.setItem("so:lastCheckin", new Date().toDateString());
      onDone?.();
    } catch {}
    setSaving(false);
  }, [mood, energy, sleep, onDone]);

  if (saved) {
    return (
      <div className="rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] p-4 text-center">
        <p className="text-sm text-[var(--so-accent,#06B6D4)] font-medium">Check-in saved!</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] p-4 space-y-3">
      <h3 className="text-sm font-semibold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">
        Daily Check-in
      </h3>
      
      {/* Mood */}
      <div>
        <p className="text-xs text-[var(--so-text-secondary,#8E8E93)] mb-1.5">How are you feeling?</p>
        <div className="flex gap-2">
          {MOODS.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(m.value)}
              className={`flex-1 flex flex-col items-center gap-0.5 rounded-xl py-2 text-lg transition ${
                mood === m.value
                  ? "bg-[rgba(6,182,212,0.1)] border border-[var(--so-accent,#06B6D4)]"
                  : "border border-transparent hover:bg-[var(--so-bg-secondary,#F2F2F7)] dark:hover:bg-[#2C2C2E]"
              }`}
            >
              <span>{m.emoji}</span>
              <span className="text-[10px] text-[var(--so-text-secondary,#8E8E93)]">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sleep */}
      <div>
        <p className="text-xs text-[var(--so-text-secondary,#8E8E93)] mb-1">Hours of sleep</p>
        <input
          type="number"
          step="0.5"
          min="0"
          max="24"
          value={sleep}
          onChange={e => setSleep(e.target.value)}
          placeholder="7.5"
          className="w-full rounded-lg border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] bg-transparent px-3 py-1.5 text-sm text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]"
        />
      </div>

      {/* Energy */}
      <div>
        <p className="text-xs text-[var(--so-text-secondary,#8E8E93)] mb-1">Energy level</p>
        <div className="flex gap-1">
          {[1,2,3,4,5].map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setEnergy(e)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                energy === e
                  ? "bg-[var(--so-accent,#06B6D4)] text-white"
                  : "border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] text-[var(--so-text-secondary,#8E8E93)]"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!mood || saving}
        className="w-full rounded-xl bg-[var(--so-accent,#06B6D4)] py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        {saving ? "Saving\u2026" : "Save Check-in"}
      </button>
    </div>
  );
}
