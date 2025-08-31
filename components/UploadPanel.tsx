'use client';
import React, { useRef, useState } from 'react';

async function safeJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: res.ok, raw: text }; }
}

type DetectedType = 'blood' | 'prescription' | 'other';

export default function UploadPanel() {
  const [busy, setBusy] = useState(false);
  const [detected, setDetected] = useState<{type:DetectedType, preview:string, note?:string} | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);

  async function detect(file: File) {
    setBusy(true); setError(null); setResult(null); setDetected(null);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/upload', { method:'POST', body: fd });
      const data = await safeJson(res);
      if (!data.ok) throw new Error(data.error || 'Detect failed');
      setDetected({ type: data.detectedType as DetectedType, preview: data.preview || '', note: data.note });
    } catch (e:any) {
      setError(String(e?.message||e));
    } finally {
      setBusy(false);
    }
  }

  async function analyze(kind: DetectedType) {
    const file = lastFileRef.current;
    if (!file) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const fd = new FormData(); fd.append('file', file);
      const endpoint =
        kind === 'blood' ? '/api/reports/blood'
        : kind === 'prescription' ? '/api/rxnorm/normalize-pdf'
        : '/api/upload'; // fallback (will just echo detection/preview)
      const res = await fetch(endpoint, { method:'POST', body: fd });
      const data = await safeJson(res);
      if (!data.ok) throw new Error(data.error || 'Analyze failed');
      setResult(data);
    } catch (e:any) {
      setError(String(e?.message||e));
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    lastFileRef.current = f;
    detect(f);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div style={{border:'1px solid var(--border, #ddd)', borderRadius:12, padding:16, display:'grid', gap:12}}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div style={{ fontWeight:600 }}>Upload a medical PDF</div>
        <label style={{
          display:'inline-flex', alignItems:'center', gap:8,
          padding:'8px 12px', border:'1px solid #ccc', borderRadius:8,
          cursor: busy ? 'default' : 'pointer', background: busy ? '#f0f0f0' : 'white', opacity: busy ? 0.7 : 1
        }}>
          <span>{busy ? 'Processing…' : 'Choose PDF'}</span>
          <input ref={fileRef} type="file" accept="application/pdf" onChange={onFile} style={{ display:'none' }} disabled={busy}/>
        </label>
      </div>

      {error && <p style={{ color:'#b00', margin:0 }}>⚠️ {error}</p>}

      {detected && (
        <div style={{ border:'1px solid #eee', borderRadius:8, padding:12, background:'#fafafa' }}>
          <p style={{ margin:'0 0 8px' }}>
            <strong>Detected:</strong> {detected.type === 'blood' ? 'Blood report' : detected.type === 'prescription' ? 'Prescription' : 'Other document'}
          </p>
          {detected.note && <p style={{ margin:'0 0 8px', color:'#555' }}>{detected.note}</p>}
          {detected.preview && (
            <details>
              <summary style={{ cursor:'pointer' }}>Preview (first lines)</summary>
              <p style={{ whiteSpace:'pre-wrap' }}>{detected.preview}</p>
            </details>
          )}
          <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
            {detected.type === 'blood' && (
              <button type="button" onClick={() => analyze('blood')} style={{ padding:'8px 12px', border:'1px solid #ccc', borderRadius:8, cursor:'pointer' }}>
                Analyze blood report
              </button>
            )}
            {detected.type === 'prescription' && (
              <button type="button" onClick={() => analyze('prescription')} style={{ padding:'8px 12px', border:'1px solid #ccc', borderRadius:8, cursor:'pointer' }}>
                Extract medicines
              </button>
            )}
            {detected.type === 'other' && (
              <button type="button" onClick={() => analyze('other')} style={{ padding:'8px 12px', border:'1px solid #ccc', borderRadius:8, cursor:'pointer' }}>
                Show text only
              </button>
            )}
          </div>
        </div>
      )}

      {result && (
        <div style={{ border:'1px solid #eee', borderRadius:8, padding:12, background:'var(--panel, #fafafa)' }}>
          {/* Prescription output */}
          {Array.isArray(result.meds) && (
            <div>
              <h3 style={{ margin:'0 0 8px' }}>Medicines detected</h3>
              {result.meds.length > 0 ? (
                <ul style={{ margin:0, paddingLeft:18 }}>
                  {result.meds.map((m: any) => (
                    <li key={m.rxcui}><strong>{m.token}</strong> → RXCUI: <code>{m.rxcui}</code></li>
                  ))}
                </ul>
              ) : <p style={{ margin:0 }}>No medicines detected.</p>}
              {result.note && <p style={{ marginTop:8, color:'#666' }}>{result.note}</p>}
            </div>
          )}

          {/* Blood output */}
          {Array.isArray(result.values) && (
            <div>
              <h3 style={{ margin:'0 0 8px' }}>Blood report summary</h3>
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
                      <td style={{borderBottom:'1px solid #f2f2f2',padding:'6px 4px'}}>
                        {v.status === 'high' ? 'High' : v.status === 'low' ? 'Low' : v.status === 'normal' ? 'Normal' : 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.disclaimer && <p style={{ marginTop:8, color:'#666', fontSize:12 }}>{result.disclaimer}</p>}
            </div>
          )}

          {/* Fallback echo (other) */}
          {!Array.isArray(result.meds) && !Array.isArray(result.values) && (
            <div>
              <h3 style={{ margin:'0 0 8px' }}>Document text (first lines)</h3>
              <p style={{ whiteSpace:'pre-wrap' }}>{result.preview || result.text || '(no preview)'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
