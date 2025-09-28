"use client";

import { Edit3, Trash2 } from "lucide-react";

const schedules = [
  { id: 1, title: "Morning medications", window: "7:00 AM" },
  { id: 2, title: "Stretch break", window: "2:00 PM" },
];

export default function SchedulesPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Schedules</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create recurring check-ins with MedX.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800"
        >
          + Add schedule
        </button>
      </div>

      <div className="flex-1 divide-y divide-slate-200 dark:divide-neutral-800">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="flex items-center gap-4 px-6 py-5">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{schedule.title}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{schedule.window}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Edit schedule"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800"
              >
                <Edit3 size={16} />
              </button>
              <button
                type="button"
                aria-label="Delete schedule"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-900/30"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
