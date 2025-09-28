"use client";

import { Edit3, Trash2 } from "lucide-react";

const schedules = [
  { id: 1, title: "Morning medications", window: "7:00 AM" },
  { id: 2, title: "Stretch break", window: "2:00 PM" },
];

export default function SchedulesPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Schedules</p>
          <p className="text-xs text-neutral-400">Create recurring check-ins with MedX.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-neutral-700 bg-neutral-800/70 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-800"
        >
          + Add schedule
        </button>
      </div>

      <div className="flex-1 divide-y divide-neutral-800/70">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="flex items-center gap-4 px-4 py-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{schedule.title}</p>
              <p className="text-xs text-neutral-400">{schedule.window}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Edit schedule"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 text-neutral-300 transition hover:border-neutral-500 hover:bg-neutral-800"
              >
                <Edit3 size={16} />
              </button>
              <button
                type="button"
                aria-label="Delete schedule"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-700/60 text-red-300 transition hover:border-red-500 hover:bg-red-900/20"
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
