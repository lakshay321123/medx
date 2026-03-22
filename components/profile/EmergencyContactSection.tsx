"use client";
import { useState, useEffect } from "react";
import { Phone } from "lucide-react";

type Contact = { name: string; phone: string; relationship: string };

export default function EmergencyContactSection() {
  const [contact, setContact] = useState<Contact>({ name: "", phone: "", relationship: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem("so:emergencyContact");
    if (s) setContact(JSON.parse(s));
  }, []);

  const save = () => {
    localStorage.setItem("so:emergencyContact", JSON.stringify(contact));
    // Also save to profile
    fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emergency_contact: contact }),
    }).catch(err => console.error('Failed to save emergency contact:', err));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input type="text" placeholder="Contact name" value={contact.name} onChange={e => setContact(prev => ({ ...prev, name: e.target.value }))}
          className="rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] bg-transparent px-3 py-2 text-sm" />
        <input type="tel" placeholder="Phone number" value={contact.phone} onChange={e => setContact(prev => ({ ...prev, phone: e.target.value }))}
          className="rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] bg-transparent px-3 py-2 text-sm" />
        <input type="text" placeholder="Relationship" value={contact.relationship} onChange={e => setContact(prev => ({ ...prev, relationship: e.target.value }))}
          className="rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] bg-transparent px-3 py-2 text-sm" />
      </div>
      <button type="button" onClick={save} disabled={!contact.name || !contact.phone}
        className="rounded-xl bg-[var(--so-accent,#06B6D4)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
        {saved ? "Saved!" : "Save Contact"}
      </button>
    </div>
  );
}
