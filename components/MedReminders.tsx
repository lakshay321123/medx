"use client";
import { useState, useEffect } from "react";
import { Bell, Plus, Clock, Pill, X } from "lucide-react";

type Reminder = { id: string; med_name: string; time: string; days: number[]; enabled: boolean };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MedReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newMed, setNewMed] = useState("");
  const [newTime, setNewTime] = useState("08:00");
  const [newDays, setNewDays] = useState<number[]>([0,1,2,3,4,5,6]);

  useEffect(() => {
    // Load from localStorage for now
    const saved = localStorage.getItem("so:reminders");
    if (saved) setReminders(JSON.parse(saved));
  }, []);

  const save = (list: Reminder[]) => {
    setReminders(list);
    localStorage.setItem("so:reminders", JSON.stringify(list));
  };

  const addReminder = () => {
    if (!newMed.trim()) return;
    const r: Reminder = {
      id: Date.now().toString(),
      med_name: newMed.trim(),
      time: newTime,
      days: newDays,
      enabled: true,
    };
    save([...reminders, r]);
    setNewMed("");
    setNewTime("08:00");
    setShowAdd(false);
  };

  const toggleReminder = (id: string) => {
    save(reminders.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const deleteReminder = (id: string) => {
    save(reminders.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">
          <Bell className="h-4 w-4 inline mr-1.5 text-[var(--so-accent,#06B6D4)]" />
          Medication Reminders
        </h3>
        <button type="button" onClick={() => setShowAdd(!showAdd)} className="text-xs font-medium text-[var(--so-accent,#06B6D4)]">
          <Plus className="h-3.5 w-3.5 inline" /> Add
        </button>
      </div>

      {showAdd && (
        <div className="rounded-2xl border border-[var(--so-accent,#06B6D4)] p-3 space-y-2.5">
          <div className="flex gap-2">
            <Pill className="h-4 w-4 mt-2.5 text-[var(--so-text-secondary,#8E8E93)]" />
            <input type="text" placeholder="Medication name" value={newMed} onChange={e => setNewMed(e.target.value)}
              className="flex-1 rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] bg-transparent px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2 items-center">
            <Clock className="h-4 w-4 text-[var(--so-text-secondary,#8E8E93)]" />
            <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
              className="rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] bg-transparent px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-1">
            {DAYS.map((d, i) => (
              <button key={i} type="button" onClick={() => setNewDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                className={`flex-1 rounded-lg py-1 text-[10px] font-medium transition ${
                  newDays.includes(i) ? "bg-[var(--so-accent,#06B6D4)] text-white" : "border border-[var(--so-border,#E5E5EA)] text-[var(--so-text-secondary,#8E8E93)]"
                }`}>{d}</button>
            ))}
          </div>
          <button type="button" onClick={addReminder} className="w-full rounded-xl bg-[var(--so-accent,#06B6D4)] py-2 text-sm font-semibold text-white">
            Save Reminder
          </button>
        </div>
      )}

      {reminders.length === 0 && !showAdd && (
        <p className="text-xs text-[var(--so-text-secondary,#8E8E93)] text-center py-3">No reminders set.</p>
      )}

      {reminders.map(r => (
        <div key={r.id} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
          r.enabled ? "border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)]" : "border-[var(--so-border,#E5E5EA)] opacity-50"
        }`}>
          <button type="button" onClick={() => toggleReminder(r.id)}
            className={`h-5 w-5 rounded-full border-2 shrink-0 ${r.enabled ? "border-[var(--so-accent,#06B6D4)] bg-[var(--so-accent,#06B6D4)]" : "border-[var(--so-border,#E5E5EA)]"}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] truncate">{r.med_name}</p>
            <p className="text-xs text-[var(--so-text-secondary,#8E8E93)]">{r.time} | {r.days.map(d => DAYS[d]).join(", ")}</p>
          </div>
          <button type="button" onClick={() => deleteReminder(r.id)} className="text-[var(--so-text-secondary,#8E8E93)]">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
