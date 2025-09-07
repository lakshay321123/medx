"use client";
import { useEffect } from "react";
import { useMemoryStore } from "@/lib/memory/useMemoryStore";

export default function UndoToast() {
  const { lastSaved, setLastSaved } = useMemoryStore();

  useEffect(() => {
    if (!lastSaved) return;
    const t = setTimeout(() => setLastSaved(null), 8000);
    return () => clearTimeout(t);
  }, [lastSaved, setLastSaved]);

  if (!lastSaved) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-sm rounded-xl border bg-white dark:bg-slate-800 shadow-lg p-3 pointer-events-auto">
      <div className="text-sm">Saved: {lastSaved.label}</div>
      <div className="mt-2 text-right">
        <button
          type="button"
          className="px-3 py-1 rounded border text-sm"
          onClick={async () => {
            try {
              await fetch(`/api/memory?id=${encodeURIComponent(lastSaved!.id)}`, { method: "DELETE", credentials: "include" });
            } catch {}
            setLastSaved(null);
          }}
        >
          Undo
        </button>
      </div>
    </div>
  );
}

