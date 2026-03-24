"use client";
import { useState, useEffect, useCallback } from "react";
import { Bell, Plus, Clock, Pill, X, Check, Loader2 } from "lucide-react";

type Reminder = {
  id: string;
  reminder_time: string;
  days_of_week: number[];
  enabled: boolean;
  medications?: { name: string; dose: string | null; frequency: string | null };
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MedReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newMed, setNewMed] = useState("");
  const [newDose, setNewDose] = useState("");
  const [newTime, setNewTime] = useState("08:00");
  const [newDays, setNewDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [saving, setSaving] = useState(false);

  // Load reminders from API
  useEffect(() => {
    fetch("/api/meds/reminders", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setReminders(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addReminder = useCallback(async () => {
    if (!newMed.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/meds/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          medName: newMed.trim(),
          dose: newDose.trim() || undefined,
          reminderTime: newTime,
          daysOfWeek: newDays,
        }),
      });
      const data = await res.json();
      if (data?.reminder) {
        setReminders((prev) => [...prev, data.reminder]);
        setNewMed("");
        setNewDose("");
        setNewTime("08:00");
        setShowAdd(false);
      }
    } catch (err) {
      console.error("Failed to add reminder:", err);
    } finally {
      setSaving(false);
    }
  }, [newMed, newDose, newTime, newDays]);

  const removeReminder = useCallback(async (id: string) => {
    try {
      await fetch(`/api/meds/reminders?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to remove reminder:", err);
    }
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Pill size={16} className="text-[var(--so-accent,#06B6D4)]" />
          <span className="text-sm font-semibold text-[var(--so-text,#000)] dark:text-white">
            Medication reminders
          </span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 text-xs text-[var(--so-accent,#06B6D4)] hover:underline"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={18} className="animate-spin text-[#8E8E93]" />
        </div>
      ) : reminders.length === 0 && !showAdd ? (
        <p className="text-xs text-[#8E8E93] text-center py-3">
          No reminders yet. Tap + Add to set up medication reminders.
        </p>
      ) : null}

      {/* Existing reminders */}
      <div className="space-y-2">
        {reminders.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--so-bg,#F2F2F7)] dark:bg-[rgba(255,255,255,0.04)] border border-[var(--so-border,#E5E5EA)] dark:border-[#2C2C2E]"
          >
            <Bell size={14} className="text-[var(--so-accent,#06B6D4)] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--so-text,#000)] dark:text-white truncate">
                {r.medications?.name || "Medication"}
              </p>
              <p className="text-xs text-[#8E8E93]">
                {r.reminder_time?.slice(0, 5)} · {r.days_of_week?.length === 7 ? "Every day" : r.days_of_week?.map((d) => DAYS[d]).join(", ")}
              </p>
            </div>
            <button
              onClick={() => removeReminder(r.id)}
              className="text-[#8E8E93] hover:text-red-500 transition"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mt-3 p-3 rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[#2C2C2E] space-y-2">
          <input
            value={newMed}
            onChange={(e) => setNewMed(e.target.value)}
            placeholder="Medication name"
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--so-border,#E5E5EA)] dark:border-[#2C2C2E] bg-transparent text-[var(--so-text,#000)] dark:text-white outline-none"
          />
          <input
            value={newDose}
            onChange={(e) => setNewDose(e.target.value)}
            placeholder="Dose (e.g., 500mg)"
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--so-border,#E5E5EA)] dark:border-[#2C2C2E] bg-transparent text-[var(--so-text,#000)] dark:text-white outline-none"
          />
          <div className="flex gap-2 items-center">
            <Clock size={14} className="text-[#8E8E93] shrink-0" />
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-[var(--so-border,#E5E5EA)] dark:border-[#2C2C2E] bg-transparent text-[var(--so-text,#000)] dark:text-white outline-none"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {DAYS.map((day, i) => (
              <button
                key={day}
                onClick={() =>
                  setNewDays((prev) =>
                    prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort(),
                  )
                }
                className={`px-2 py-1 text-xs rounded-md transition ${
                  newDays.includes(i)
                    ? "bg-[var(--so-accent,#06B6D4)] text-white"
                    : "bg-[var(--so-bg,#F2F2F7)] dark:bg-[rgba(255,255,255,0.06)] text-[#8E8E93]"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={addReminder}
              disabled={!newMed.trim() || saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[var(--so-accent,#06B6D4)] text-white disabled:opacity-50 transition"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-xs text-[#8E8E93] hover:text-[var(--so-text,#000)] dark:hover:text-white transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
