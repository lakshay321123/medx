"use client";
import { useState, useCallback } from "react";

const MOODS = [
  { emoji: "\uD83D\uDE1E", label: "Bad", value: 1, color: "#FF3B30" },
  { emoji: "\uD83D\uDE15", label: "Low", value: 2, color: "#FF9500" },
  { emoji: "\uD83D\uDE10", label: "Okay", value: 3, color: "#FFCC00" },
  { emoji: "\uD83D\uDE42", label: "Good", value: 4, color: "#34C759" },
  { emoji: "\uD83D\uDE04", label: "Great", value: 5, color: "#30D158" },
];

export default function DailyCheckin({ onDone }: { onDone?: () => void }) {
  // Skip if already checked in today
  const [alreadyDone] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("so:lastCheckin") === new Date().toDateString();
  });
  if (alreadyDone) return null;

  const [mood, setMood] = useState<number | null>(null);
  const [sleep, setSleep] = useState("7");
  const [energy, setEnergy] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = useCallback(async () => {
    if (!mood) return;
    setSaving(true);
    try {
      const profileRes = await fetch("/api/profile", { credentials: "include" });
      const profileData = await profileRes.json().catch(() => ({}));
      const userId = profileData?.profile?.id;
      if (!userId) throw new Error("Not logged in");
      
      const resp = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          mood,
          energy,
          sleepHours: sleep ? parseFloat(sleep) : null,
        }),
      });
      if (!resp.ok) throw new Error("Check-in failed");
      setSaved(true);
      localStorage.setItem("so:lastCheckin", new Date().toDateString());
      onDone?.();
    } catch (err) {
      console.error("Check-in save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [mood, energy, sleep, onDone]);

  if (saved) {
    return (
      <div className="py-8 text-center">
        <div className="text-3xl mb-2">{MOODS.find(m => m.value === mood)?.emoji || "\u2705"}</div>
        <p className="text-sm font-medium text-[var(--so-accent,#06B6D4)]">Check-in saved!</p>
        <p className="text-xs text-[var(--so-text-secondary,#8E8E93)] mt-1">See you tomorrow</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-1">
          Daily Check-in
        </h3>
        <p className="text-xs text-[var(--so-text-secondary,#8E8E93)]">Track your well-being every day</p>
      </div>

      {/* Mood — large emoji buttons */}
      <div>
        <p className="text-xs font-medium text-[var(--so-text-secondary,#8E8E93)] mb-3">How are you feeling today?</p>
        <div className="flex justify-between">
          {MOODS.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(m.value)}
              aria-pressed={mood === m.value}
              className="flex flex-col items-center gap-1.5 transition-transform"
              aria-pressed={mood === m.value}
              aria-label={`Mood: ${m.label}`}
              style={{ transform: mood === m.value ? "scale(1.15)" : "scale(1)" }}
            >
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition-all ${
                mood === m.value
                  ? "shadow-lg"
                  : "bg-[var(--so-bg-secondary,#F2F2F7)] dark:bg-[#2C2C2E]"
              }`} style={mood === m.value ? { backgroundColor: m.color + "18", boxShadow: `0 4px 12px ${m.color}30` } : {}}>
                {m.emoji}
              </div>
              <span className={`text-[11px] font-medium transition-colors ${
                mood === m.value ? "text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]" : "text-[var(--so-text-secondary,#8E8E93)]"
              }`}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sleep — slider style */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-[var(--so-text-secondary,#8E8E93)]">Hours of sleep</p>
          {sleep && <span className="text-sm font-semibold text-[var(--so-accent,#06B6D4)]">{sleep}h</span>}
        </div>
        <input
          type="range"
          min="0"
          max="12"
          step="0.5"
          value={sleep}
          onChange={e => setSleep(e.target.value)}
          aria-label="Hours of sleep"
          className="w-full h-2 rounded-full appearance-none bg-[var(--so-border,#E5E5EA)] dark:bg-[#2C2C2E] accent-[var(--so-accent,#06B6D4)]"
        />
        <div className="flex justify-between text-[10px] text-[var(--so-text-secondary,#8E8E93)] mt-1">
          <span>0h</span><span>6h</span><span>12h</span>
        </div>
      </div>

      {/* Energy — pill buttons */}
      <div>
        <p className="text-xs font-medium text-[var(--so-text-secondary,#8E8E93)] mb-2">Energy level</p>
        <div className="flex gap-2">
          {[1,2,3,4,5].map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setEnergy(e)}
              aria-pressed={energy === e}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${
                energy === e
                  ? "bg-[var(--so-accent,#06B6D4)] text-white shadow-md"
                  : "bg-[var(--so-bg-secondary,#F2F2F7)] dark:bg-[#2C2C2E] text-[var(--so-text-secondary,#8E8E93)]"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-[var(--so-text-secondary,#8E8E93)] mt-1">
          <span>Exhausted</span><span>Energized</span>
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!mood || saving}
        className="w-full rounded-2xl bg-[var(--so-accent,#06B6D4)] py-3 text-sm font-semibold text-white disabled:opacity-40 transition-all hover:shadow-lg active:scale-[0.98]"
      >
        {saving ? "Saving\u2026" : "Save Check-in"}
      </button>
    </div>
  );
}
