"use client";
import { useEffect, useState } from "react";
import { safeJson } from "@/lib/safeJson";

interface PreferencesProps {
  className?: string;
}

export default function Preferences({ className = "" }: PreferencesProps) {
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
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">Process my health data</p>
        <p className="text-xs text-neutral-400">
          Allow MedX to analyze health information for smarter insights.
        </p>
      </div>
      <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
        <span className="sr-only">Process my health data</span>
        <input
          type="checkbox"
          checked={consent}
          onChange={toggle}
          className="peer sr-only"
        />
        <span
          className="absolute inset-0 rounded-full bg-neutral-700 transition peer-checked:bg-sky-500/90"
          aria-hidden="true"
        />
        <span
          className="relative ml-1 inline-block h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5"
          aria-hidden="true"
        />
      </label>
    </div>
  );
}
