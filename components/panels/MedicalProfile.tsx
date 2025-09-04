'use client';
import { useEffect, useState } from 'react';
import { safeJson } from '@/lib/safeJson';

type Observation = { kind: string; value: any; observedAt: string };

export default function MedicalProfile() {
  const [obs, setObs] = useState<Observation[]>([]);

  useEffect(() => {
    safeJson(fetch('/api/observations?userId=me'))
      .then(setObs)
      .catch(() => setObs([]));
  }, []);

  const latest = (kind: string) => obs.find(o => o.kind === kind);

  return (
    <div className="p-4 space-y-4">
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Vitals</h2>
        <ul className="text-sm space-y-1">
          {['bp','hr','bmi'].map(k => {
            const o = latest(k);
            return <li key={k}>{k.toUpperCase()}: {o ? JSON.stringify(o.value) : '—'}</li>;
          })}
        </ul>
      </section>
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Labs</h2>
        <ul className="text-sm space-y-1">
          {['HbA1c','FPG','eGFR'].map(k => {
            const o = latest(k);
            return <li key={k}>{k}: {o ? JSON.stringify(o.value) : '—'}</li>;
          })}
        </ul>
      </section>
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Symptoms/notes</h2>
        <ul className="text-sm space-y-1">
          {obs.filter(o => typeof o.value === 'string').slice(0,5).map(o => (
            <li key={o.observedAt}>{o.value}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
