'use client';
import React, { useRef, useState } from 'react';

async function safeJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: res.ok, raw: text }; }
}

export default function UploadPanel() {
  const [mode, setMode] = useState<'prescription'|'blood'>('prescription');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const endpoint = mode === 'prescription'
        ? '/api/rxnorm/normalize-pdf'
        : '/api/reports/blood';
      const res = await fetch(endpoint, { method:'POST', body: fd });
      const data = await safeJson(res);
      setResult(data);
    } catch (err:any) {
      setResult({ ok:false, error: String(err?.message||err) });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div style={{border:'1px solid var(--border, #ddd)', borderRadius:12, padding:16, display:'grid', gap:12}}>
      <div
