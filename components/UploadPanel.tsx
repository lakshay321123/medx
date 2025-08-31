// components/UploadPanel.tsx
'use client';
import React, { useRef, useState } from 'react';

async function safeJson(res: Response) {
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { ok: res.ok, raw: txt }; }
}

type DetectedType = 'blood' | 'prescription' | 'other';

export default function UploadPanel() {
  const [busy, setBusy] = useState(false);
  const [detected, setDetected] = useState<{type:DetectedType, preview?:string, note?:string} | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    lastFileRef.current = f;
    setBusy(true); setError(null); setResult(null); setDetected(null);

    try {
      const fd = new FormData(); fd.append('file', f);

      // Use the proxy that guarantees JSON
      const res = await fetch('/api/upload', { method:'POST', body: fd });
      const data = await safeJson(res);

      if (!data || data.ok === false) {
        throw new Error(data?.error || 'Analyze failed');
      }

      setDetected({ type: (data.detectedType || 'other') as DetectedType, preview: data.preview, note: data.note });
      setResult(data);
    } catch (err:any) {
      setError(String(err?.message||err));
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
          {/* Prescription */}
          {Array.isArray(result.meds) && (
            <>
              <h3 style={{ margin:'0 0 8px' }}>Prescription analysis</h3>
              {result.meds.length > 0 ? (
                <ul style={{ margin:0, paddingLeft:18 }}>
                  {result.meds.map((m: any, i:number) => (
                    <li key={`${m.rxcui}-${i}`}><strong>{m.token || m.name || m.rxcui}</strong> — RXCUI: <code>{m.rxcui}</code></li>
                  ))}
                </ul>
              ) : <p style={{ margin:0 }}>No medications confidently recognized. You can type them manually (one per line).</p>}
              {result.note && <p style={{ marginTop:8, color:'#666' }}>{result.note}</p>}
            </>
          )}

          {/* Blood */}
          {Array.isArray(result.values) && (
            <>
              <h3 style={{ margin:'0 0 8px' }}>Blood report analysis</h3>
              {result.summary && <p style={{ margin:'0 0 8px' }}>{result.summary}</p>}
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
                <thead>
                  <tr>
                    <th style={{textAlign:'left',borderBottom:'1px solid #eee',padding:'6px 4px'}}>Test</th>
                    <th style={{textAlign:'left',borderBottom:'1px solid #eee',padding:'6px 4px'}}>Value</th>
                    <th style={{textAlign:'left',borderBottom:'1px solid #eee',padding:'6px 4px'}}>Reference</th>
                    <th style={{textAlign:'left',borderBottom:'1px solid #eee',padding:'6px 4px'}}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.values.map((v: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{borderBottom:'1px solid #f2f2f2',padding:'6px 4px'}}>{v.label || v.key}</td>
                      <td style={{borderBottom:'1px solid #f2f2f2',padding:'6px 4px'}}>{v.value} {v.unit || ''}</td>
                      <td style={{borderBottom:'1px solid #f2f2f2',padding:'6px 4px',color:'#555'}}>
                        {v.ref ? `${v.ref.min}–${v.ref.max} ${v.ref.unit}` : '—'}
                      </td>
                      <td style={{borderBottom:'1px solid #f2f2f2',padding:'6px 4px'}}>{v.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.disclaimer && <p style={{ marginTop:8, color:'#666', fontSize:12 }}>{result.disclaimer}</p>}
            </>
          )}

          {/* Other */}
          {!Array.isArray(result.meds) && !Array.isArray(result.values) && (
            <>
              <h3 style={{ margin:'0 0 8px' }}>Document preview</h3>
              <p style={{ whiteSpace:'pre-wrap' }}>{result.preview || '(no preview)'}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
