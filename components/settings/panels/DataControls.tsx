"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrefsDraft } from "@/components/providers/PrefsDraftProvider";
import { useChatStore } from "@/lib/state/chatStore";
import { persist } from "@/lib/utils/persist";

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function DataControlsPanel() {
  const { draft, set } = usePrefsDraft();
  const memoryEnabled = Boolean(draft.memoryEnabled);
  const memoryAutosave = Boolean(draft.memoryAutosave);
  const persistDrafts = Boolean(draft.persistAssistantDrafts);
  const currentChatId = useChatStore(s => s.currentId);
  const [clearing, setClearing] = useState(false);
  const [cacheBytes, setCacheBytes] = useState<number | null>(null);

  const updateCacheSize = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const { bytes } = await persist.estimateSize();
      setCacheBytes(bytes);
    } catch {
      setCacheBytes(null);
    }
  }, []);

  useEffect(() => {
    void updateCacheSize();
  }, [updateCacheSize]);

  const handleClear = useCallback(async () => {
    if (typeof window === "undefined") return;
    setClearing(true);
    try {
      const target = currentChatId ?? "*";
      await persist.clearByPrefix(target);
    } finally {
      setClearing(false);
      void updateCacheSize();
    }
  }, [currentChatId, updateCacheSize]);

  const Toggle = (checked: boolean, onChange: () => void) => (
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="h-6 w-11 rounded-full bg-slate-300/60 transition peer-checked:bg-blue-600" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
    </label>
  );

  return (
    <div className="p-5 space-y-4">
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

      <div className="rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-900/60">
        <div className="mb-1 text-[13px] font-semibold">Draft recovery</div>
        <div className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Stores partial assistant replies locally for quicker recovery after reload. Clears automatically after 7 days.
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="text-sm">Keep assistant drafts on this device</div>
          {Toggle(persistDrafts, () => set("persistAssistantDrafts", !persistDrafts))}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Cached replies: {formatBytes(cacheBytes)}</span>
          <button
            type="button"
            onClick={handleClear}
            disabled={clearing}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {clearing ? "Clearing…" : "Clear cached replies"}
          </button>
        </div>
      </div>
    </div>
  );
}
