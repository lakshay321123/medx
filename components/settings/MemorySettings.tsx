"use client";
import { useMemoryStore } from "@/lib/memory/useMemoryStore";

export function MemorySettings() {
  const { enabled, setEnabled, autoSave, setAutoSave } = useMemoryStore();
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
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-slate-600">Auto-save detected memories</div>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoSave}
            onChange={(e) => setAutoSave(e.target.checked)}
            disabled={!enabled}
          />
          <span className="text-sm">{autoSave ? "On" : "Off"}</span>
        </label>
      </div>
    </div>
  );
}
