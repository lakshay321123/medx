"use client";
import { useState, useEffect } from "react";
import { AlertTriangle, Plus, X } from "lucide-react";

export default function AllergiesSection() {
  const [allergies, setAllergies] = useState<string[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("so:allergies");
    if (saved) setAllergies(JSON.parse(saved));
  }, []);

  const save = (list: string[]) => {
    setAllergies(list);
    localStorage.setItem("so:allergies", JSON.stringify(list));
    // Also save to observations
    fetch("/api/observations/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ observations: list.map(a => ({ kind: "allergy", value_text: a, meta: { source: "manual" } })) }),
    }).catch(() => {});
  };

  const add = () => {
    const v = input.trim();
    if (!v || allergies.includes(v)) return;
    save([...allergies, v]);
    setInput("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>List all known drug and food allergies</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {allergies.map(a => (
          <span key={a} className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-500/10 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300">
            {a}
            <button type="button" onClick={() => save(allergies.filter(x => x !== a))}><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
          placeholder="e.g., Penicillin, Sulfa, Peanuts"
          className="flex-1 rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] bg-transparent px-3 py-2 text-sm" />
        <button type="button" onClick={add} className="rounded-xl bg-[var(--so-accent,#06B6D4)] px-3 py-2 text-xs font-semibold text-white">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
