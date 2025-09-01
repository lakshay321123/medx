'use client';
import React, { useRef, useState } from 'react';

async function safeJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: res.ok, raw: text }; }
}

type DetectedType = 'blood' | 'prescription' | 'other';

export default function UploadPanel() {
  const [busy, setBusy] = useState(false);
  const [detected, setDetected] = useState<{type:DetectedType, note?:string} | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true); setError(null); setResult(null); setDetected(null);

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await safeJson(res);

      // Always handle both success and error as JSON
      if (!data || data.ok === false) {
        throw new Error(data?.error || 'Upload failed');
      }

      setDetected({ type: data.detectedType as DetectedType, note: data.note });
      setResult(data);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div style={{border:'1px solid var(--border, #ddd)', borderRadius:12, padding:16, display:'grid', gap:12}}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div style={{ fontWeight:600 }}>Upload a medical PDF</div>
        <label style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 12px',
          border:'1px solid #ccc', borderRadius:8, cursor: busy ? 'default' : 'pointer',
          background: busy ? '#f0f0f0' : 'white', opacity: busy ? 0.7 : 1 }}>
          <span>{busy ? 'Processing…' : 'Choose PDF'}</span>
          <input ref={fileRef} type="file" accept="application/pdf" onChange={onFile} style={{ display:'none' }} disabled={busy}/>
        </label>
      </div>

      {error && <p style={{ color:'#b00', margin:0 }}>⚠️ {error}</p>}

      {detected && (
        <p style={{ margin:'0 0 8px' }}>
          <strong>Detected:</strong> {detected.type}{detected.note ? ` — ${detected.note}` : ''}
        </p>
      )}

      {result && (
        <div style={{ border:'1px solid #eee', borderRadius:8, padding:12, background:'var(--panel, #fafafa)' }}>
          <h3 style={{ margin:'0 0 8px' }}>Result</h3>
          {result.preview ? (
            <pre style={{ whiteSpace:'pre-wrap', margin:0, fontSize:13 }}>{result.preview}</pre>
          ) : (
            <pre style={{ whiteSpace:'pre-wrap', margin:0, fontSize:13 }}>{JSON.stringify(result, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}
