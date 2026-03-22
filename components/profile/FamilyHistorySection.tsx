"use client";
import { useState, useEffect } from "react";
import { Heart, Plus, X } from "lucide-react";

type FamilyCondition = { relation: string; condition: string };

const RELATIONS = ["Father", "Mother", "Brother", "Sister", "Grandparent", "Other"];
const COMMON_CONDITIONS = ["Diabetes", "Heart Disease", "Cancer", "Hypertension", "Stroke", "Asthma", "Mental illness", "Kidney disease"];

export default function FamilyHistorySection() {
  const [entries, setEntries] = useState<FamilyCondition[]>([]);
  const [relation, setRelation] = useState("");
  const [condition, setCondition] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("so:familyHistory");
    if (saved) setEntries(JSON.parse(saved));
  }, []);

  const save = (list: FamilyCondition[]) => {
    setEntries(list);
    localStorage.setItem("so:familyHistory", JSON.stringify(list));
  };

  const add = () => {
    if (!relation || !condition) return;
    save([...entries, { relation, condition }]);
    setRelation("");
    setCondition("");
  };

  return (
    <div className="space-y-3">
      {entries.length > 0 && (
        <div className="space-y-1.5">
          {entries.map((e, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] px-3 py-2 text-xs">
              <span><span className="font-medium">{e.relation}:</span> {e.condition}</span>
              <button type="button" onClick={() => save(entries.filter((_, j) => j !== i))}><X className="h-3 w-3 text-[var(--so-text-secondary,#8E8E93)]" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <select value={relation} onChange={e => setRelation(e.target.value)}
          className="rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] bg-transparent px-3 py-2 text-xs">
          <option value="">Relation</option>
          {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={condition} onChange={e => setCondition(e.target.value)}
          className="rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] bg-transparent px-3 py-2 text-xs">
          <option value="">Condition</option>
          {COMMON_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <button type="button" onClick={add} disabled={!relation || !condition}
        className="flex items-center gap-1.5 text-xs font-medium text-[var(--so-accent,#06B6D4)] disabled:opacity-40">
        <Plus className="h-3.5 w-3.5" /> Add family history
      </button>
    </div>
  );
}
