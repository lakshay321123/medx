"use client";

import { useState } from "react";
import { usePrefsDraft } from "@/components/providers/PrefsDraftProvider";

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center shrink-0">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="h-6 w-11 rounded-full bg-slate-300/60 transition peer-checked:bg-blue-600 dark:bg-slate-600" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
    </label>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-900/60">
      <div className="mb-1 text-[13px] font-semibold">{title}</div>
      {sub && <div className="mb-3 text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
      {children}
    </div>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type ScheduleItem = {
  id: string;
  type: "checkin" | "report" | "sync" | "backup";
  label: string;
  time: string;
  days: number[];
  enabled: boolean;
};

const DEFAULT_SCHEDULES: ScheduleItem[] = [
  { id: "daily_checkin", type: "checkin", label: "Daily health check-in reminder", time: "09:00", days: [0, 1, 2, 3, 4, 5, 6], enabled: true },
  { id: "weekly_report", type: "report", label: "Weekly health summary report", time: "08:00", days: [1], enabled: true },
  { id: "wearable_sync", type: "sync", label: "Wearable data sync", time: "06:00", days: [0, 1, 2, 3, 4, 5, 6], enabled: true },
  { id: "monthly_backup", type: "backup", label: "Monthly data export backup", time: "02:00", days: [0], enabled: false },
];

export default function SchedulesPanel() {
  const { draft, set } = usePrefsDraft();
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    const saved = (draft as any)?.["schedules.items"];
    if (Array.isArray(saved) && saved.length) return saved;
    return DEFAULT_SCHEDULES;
  });

  const persist = (updated: ScheduleItem[]) => {
    setSchedules(updated);
    set("schedules.items" as any, updated);
  };

  const toggleEnabled = (id: string) => {
    persist(schedules.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const updateTime = (id: string, time: string) => {
    persist(schedules.map((s) => s.id === id ? { ...s, time } : s));
  };

  const toggleDay = (id: string, day: number) => {
    persist(schedules.map((s) => {
      if (s.id !== id) return s;
      const days = s.days.includes(day) ? s.days.filter((d) => d !== day) : [...s.days, day].sort();
      return { ...s, days };
    }));
  };

  const typeIcons: Record<string, string> = {
    checkin: "Check-in",
    report: "Report",
    sync: "Sync",
    backup: "Backup",
  };

  return (
    <div className="space-y-4 p-5">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Configure automated schedules for health check-ins, reports, data syncing, and backups.
      </div>

      {schedules.map((sched) => (
        <Section key={sched.id} title={sched.label}>
          <div className="space-y-3">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-black/10 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300">
                  {typeIcons[sched.type]}
                </span>
                <span className="text-sm">{sched.enabled ? "Enabled" : "Disabled"}</span>
              </div>
              <Toggle checked={sched.enabled} onChange={() => toggleEnabled(sched.id)} />
            </div>

            {sched.enabled && (
              <>
                {/* Time picker */}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Time</label>
                  <input
                    type="time"
                    value={sched.time}
                    onChange={(e) => updateTime(sched.id, e.target.value)}
                    className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Day selector */}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Days</label>
                  <div className="flex gap-1.5">
                    {DAYS.map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDay(sched.id, idx)}
                        className={[
                          "w-9 h-9 rounded-lg text-xs font-medium transition",
                          sched.days.includes(idx)
                            ? "bg-blue-600 text-white"
                            : "border border-black/10 bg-white/70 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300",
                        ].join(" ")}
                      >
                        {label}
                      </button>
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
