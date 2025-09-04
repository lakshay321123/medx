'use client';
import { useEffect, useState } from 'react';
import { safeJson } from '@/lib/safeJson';

interface Alert { id: string; severity: string; title: string; createdAt: string; status: string; }

export default function AlertsPane() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const load = () => {
    safeJson(fetch('/api/alerts?status=open'))
      .then(setAlerts)
      .catch(() => setAlerts([]));
  };

  useEffect(() => { load(); }, []);

  const ack = async (id: string) => {
    await fetch(`/api/alerts/${id}/ack`, { method: 'POST' });
    setAlerts(a => a.filter(al => al.id !== id));
  };

  return (
    <div className="p-4 space-y-2">
      {alerts.length ? (
        <ul className="space-y-2">
          {alerts.map(a => (
            <li key={a.id} className="rounded-xl border p-3 flex items-center gap-2 text-sm">
              <span className="px-2 py-0.5 rounded-full border text-xs">{a.severity}</span>
              <span className="flex-1">{a.title}</span>
              <span className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleDateString()}</span>
              <button onClick={() => ack(a.id)} className="text-xs underline">Ack</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No alerts.</p>
      )}
    </div>
  );
}
