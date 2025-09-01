'use client';
import React, { useState } from 'react';

export default function UploadTestPage() {
  const [out, setOut] = useState<string>('');
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true); setOut('');
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const txt = await res.text();
      setOut(`HTTP ${res.status}\n\n${txt}`);
    } catch (err: any) {
      setOut(`CLIENT ERROR: ${String(err?.message || err)}`);
    } finally {
      setBusy(false);
      e.currentTarget.value = '';
    }
  }

  return (
    <div style={{maxWidth:720, margin:'40px auto', padding:'16px', fontFamily:'system-ui, sans-serif'}}>
      <h1>Upload Test</h1>
      <input type="file" accept="application/pdf" onChange={onFile} disabled={busy}/>
      <pre style={{whiteSpace:'pre-wrap', background:'#f7f7f7', padding:'12px', borderRadius:8, marginTop:16}}>
        {out || 'Response will appear here...'}
      </pre>
      <p style={{color:'#666', fontSize:13}}>
        Tip: Open <code>/api/upload</code> and <code>/api/analyze-doc</code> directly in browser to see health JSON.
      </p>
    </div>
  );
}
