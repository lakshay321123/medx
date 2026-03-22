"use client";

import { useState } from "react";
import clsx from "clsx";
import { usePrefsDraft } from "@/components/providers/PrefsDraftProvider";

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center shrink-0">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="h-6 w-11 rounded-full bg-slate-300/60 transition peer-checked:bg-[var(--so-accent,#06B6D4)] dark:bg-slate-600" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-900/60">
      <div className="mb-3 text-[13px] font-semibold">{title}</div>
      {children}
    </div>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type ScheduleType = "checkin" | "report" | "sync" | "backup";
type ScheduleItem = { id: string; type: ScheduleType; label: string; time: string; days: number[]; enabled: boolean };

const TYPE_LABELS: Record<ScheduleType, string> = { checkin: "Check-in", report: "Report", sync: "Sync", backup: "Backup" };

const DEFAULT_SCHEDULES: ScheduleItem[] = [
  { id: "daily_checkin", type: "checkin", label: "Daily health check-in reminder", time: "09:00", days: [0,1,2,3,4,5,6], enabled: true },
  { id: "weekly_report", type: "report", label: "Weekly health summary report", time: "08:00", days: [1], enabled: true },
  { id: "wearable_sync", type: "sync", label: "Wearable data sync", time: "06:00", days: [0,1,2,3,4,5,6], enabled: true },
  { id: "monthly_backup", type: "backup", label: "Monthly data export backup", time: "02:00", days: [0], enabled: false },
];

function isValidSchedules(data: unknown): data is ScheduleItem[] {
  if (!Array.isArray(data)) return false;
  return data.every((d) => typeof d === "object" && d !== null && "id" in d && "type" in d && "label" in d && "time" in d && "days" in d);
}

export default function SchedulesPanel() {
  const { draft, set } = usePrefsDraft();
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    const saved = (draft as Record<string, unknown>)?.["schedules.items"];
    return isValidSchedules(saved) ? saved : DEFAULT_SCHEDULES;
  });

  const persist = (updated: ScheduleItem[]) => {
    setSchedules(updated);
    set("schedules.items" as keyof typeof draft, updated);
  };

  const toggleEnabled = (id: string) => persist(schedules.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));
  const updateTime = (id: string, time: string) => persist(schedules.map((s) => s.id === id ? { ...s, time } : s));
  const toggleDay = (id: string, day: number) => persist(schedules.map((s) => {
    if (s.id !== id) return s;
    const days = s.days.includes(day) ? s.days.filter((d) => d !== day) : [...s.days, day].sort();
    return { ...s, days };
  }));

  return (
    <div className="space-y-4 p-5">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Configure automated schedules for health check-ins, reports, data syncing, and backups.
      </div>
      {schedules.map((sched) => (
        <Section key={sched.id} title={sched.label}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-black/10 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300">
                  {TYPE_LABELS[sched.type]}
                </span>
                <span className="text-sm">{sched.enabled ? "Enabled" : "Disabled"}</span>
              </div>
              <Toggle checked={sched.enabled} onChange={() => toggleEnabled(sched.id)} />
            </div>
            {sched.enabled && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Time</label>
                  <input type="time" value={sched.time} onChange={(e) => updateTime(sched.id, e.target.value)}
                    className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Days</label>
                  <div className="flex gap-1.5">
                    {DAYS.map((label, idx) => (
                      <button key={idx} type="button" onClick={() => toggleDay(sched.id, idx)}
                        className={clsx("w-9 h-9 rounded-lg text-xs font-medium transition",
                          sched.days.includes(idx)
                            ? "text-white bg-[var(--so-accent,#06B6D4)]"
                            : "border border-black/10 bg-white/70 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
                        )}>{label}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Section>
      ))}
    </div>
  );
}
