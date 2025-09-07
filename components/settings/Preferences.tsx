"use client";
import { useEffect, useState } from "react";
import { safeJson } from "@/lib/safeJson";

export default function Preferences() {
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    safeJson(fetch("/api/auth/session"))
      .then((s) => setConsent(Boolean(s?.user?.consentFlags?.process)))
      .catch(() => setConsent(false));
  }, []);

  const toggle = async () => {
    const next = !consent;
    setConsent(next);
    try {
      await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentFlags: { process: next } }),
      });
    } catch {}
  };

  return (
    <div className="rounded-xl border p-4">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={consent} onChange={toggle} />
        <span className="text-sm">Process my health data</span>
      </label>
    </div>
  );
}
