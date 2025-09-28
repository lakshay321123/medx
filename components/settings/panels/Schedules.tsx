"use client";
import { Pencil, Trash2, Plus } from "lucide-react";
export default function SchedulesPanel() {
  const Item = ({ label }: { label: string }) => (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <div className="text-[13px]">{label}</div>
      <div className="flex gap-2">
        <button className="rounded-md border border-black/10 bg-white/70 px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-900/60">
          <Pencil size={14} />
        </button>
        <button className="rounded-md border border-black/10 bg-white/70 px-2 py-1 text-xs text-red-600 dark:border-white/10 dark:bg-slate-900/60">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
  return (
    <>
      <div className="flex items-center justify-between px-5 py-3">
        <div className="text-[13px] font-semibold">Schedules</div>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">
          <Plus size={14} /> Add schedule
        </button>
      </div>
      <Item label="Daily meds — 8:00 AM" />
      <Item label="Weekly digest — Mondays" />
    </>
  );
}
