"use client";

import { usePrefsDraft } from "@/components/providers/PrefsDraftProvider";

export default function DataControlsPanel() {
  const { draft, set } = usePrefsDraft();
  const memoryEnabled = Boolean(draft.memoryEnabled);
  const memoryAutosave = Boolean(draft.memoryAutosave);

  const Toggle = (checked: boolean, onChange: () => void) => (
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="h-6 w-11 rounded-full bg-slate-300/60 transition peer-checked:bg-blue-600" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
    </label>
  );

  return (
    <div className="p-5">
      <div className="rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-900/60">
        <div className="mb-1 text-[13px] font-semibold">Smart Memory</div>
        <div className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Remember preferences and key facts with your consent. You can turn this off anytime.
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="text-sm">Enabled</div>
          {Toggle(memoryEnabled, () => set("memoryEnabled", !memoryEnabled))}
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="text-sm">Auto-save detected memories</div>
          {Toggle(memoryAutosave, () => set("memoryAutosave", !memoryAutosave))}
        </div>
      </div>
    </div>
  );
}
