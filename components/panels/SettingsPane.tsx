'use client';
import { useEffect, useState } from 'react';

export default function SettingsPane() {
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => (r.ok ? r.json() : null))
      .then(s => setConsent(Boolean(s?.user?.consentFlags?.process)));
  }, []);

  const toggle = async () => {
    const next = !consent;
    setConsent(next);
    try {
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentFlags: { process: next } }),
      });
    } catch {}
  };

  return (
    <div className="p-4">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={consent} onChange={toggle} />
        <span className="text-sm">Process my health data</span>
      </label>
    </div>
  );
}
