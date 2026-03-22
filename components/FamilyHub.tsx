"use client";
import { useState, useEffect } from "react";
import { Users, Plus, UserCircle, ChevronRight } from "lucide-react";

type FamilyMember = {
  id: string;
  display_name: string;
  relationship: string;
  dob?: string;
  sex?: string;
};

export default function FamilyHub() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRelation, setNewRelation] = useState("");

  useEffect(() => {
    fetch("/api/family/members", { credentials: "include" })
      .then(r => r.json())
      .then(d => setMembers(Array.isArray(d?.members) ? d.members : []))
      .catch(err => console.error('Failed to load family members:', err));
  }, []);

  const addMember = async () => {
    if (!newName.trim() || !newRelation.trim()) return;
    try {
      await fetch("/api/family/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: newName.trim(), relationship: newRelation.trim() }),
      });
      setMembers(prev => [...prev, { id: Date.now().toString(), display_name: newName, relationship: newRelation }]);
      setNewName("");
      setNewRelation("");
      setShowAdd(false);
    } catch {}
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">Family Members</h3>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 text-xs font-medium text-[var(--so-accent,#06B6D4)]"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {showAdd && (
        <div className="rounded-2xl border border-[var(--so-accent,#06B6D4)] p-3 space-y-2">
          <input
            type="text"
            placeholder="Name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] bg-transparent px-3 py-2 text-sm text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]"
          />
          <input
            type="text"
            placeholder="Relationship (e.g., Mother, Spouse)"
            value={newRelation}
            onChange={e => setNewRelation(e.target.value)}
            className="w-full rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] bg-transparent px-3 py-2 text-sm text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]"
          />
          <button
            type="button"
            onClick={addMember}
            className="w-full rounded-xl bg-[var(--so-accent,#06B6D4)] py-2 text-sm font-semibold text-white"
          >
            Add Member
          </button>
        </div>
      )}

      {members.length === 0 && !showAdd ? (
        <p className="text-xs text-[var(--so-text-secondary,#8E8E93)] text-center py-4">
          No family members yet. Add someone to track their health too.
        </p>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(6,182,212,0.08)]">
                <UserCircle className="h-6 w-6 text-[var(--so-accent,#06B6D4)]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">{m.display_name}</p>
                <p className="text-xs text-[var(--so-text-secondary,#8E8E93)]">{m.relationship}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--so-text-secondary,#8E8E93)]" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
