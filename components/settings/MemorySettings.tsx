"use client";
import { useMemoryStore } from "@/lib/memory/useMemoryStore";

export function MemorySettings() {
  const { enabled, setEnabled } = useMemoryStore();
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Smart Memory</div>
          <div className="text-sm text-slate-500">
            Remember preferences and key facts with your consent. You can turn this off anytime.
          </div>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span className="text-sm">Enabled</span>
        </label>
      </div>
    </div>
  );
}
