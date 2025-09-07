"use client";
import { useMemoryStore } from "@/lib/memory/useMemoryStore";

export function MemorySettings() {
  const { enabled, setEnabled } = useMemoryStore();
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={enabled}
        onChange={e => setEnabled(e.target.checked)}
      />
      <span className="text-sm">Smart Memory</span>
    </label>
  );
}

