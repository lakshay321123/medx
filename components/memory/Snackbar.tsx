"use client";
import { useMemoryStore } from "@/lib/memory/useMemoryStore";

export default function MemorySnackbar() {
  const { suggestions, clearSuggestion } = useMemoryStore();

  if (!suggestions.length) return null;
  const current = suggestions[0];

  const onSave = async () => {
    await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(current),
    });
    clearSuggestion(current.key);
  };

  const onDismiss = () => clearSuggestion(current.key);

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border bg-white dark:bg-slate-800 shadow-lg p-3">
      <div className="text-sm mb-2">Save memory: {current.key}?</div>
      <div className="flex gap-2 justify-end">
        <button onClick={onDismiss} className="px-3 py-1 border text-sm">No</button>
        <button onClick={onSave} className="px-3 py-1 bg-blue-600 text-white text-sm">Save</button>
      </div>
    </div>
  );
}
