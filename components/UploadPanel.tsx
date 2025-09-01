'use client';
import React, { useRef, useState } from 'react';

async function safeJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: res.ok, raw: text }; }
}

export default function UploadPanel() {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true); setError(null); setOut('');
    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await safeJson(res);

      if (!data || data.ok === false) {
        throw new Error(data?.error || 'Upload failed');
      }

      setOut(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="application/pdf" onChange={onFile} disabled={busy}/>
      {error && <pre>ERROR: {error}</pre>}
      {out && <pre>{out}</pre>}
    </div>
  );
}
