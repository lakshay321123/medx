'use client';

import React, { useRef, useState } from 'react';

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: res.ok, raw: text };
  }
}

export default function UploadPanel() {
  const [mode, setMode] = useState<'prescription' | 'blood'>('prescription');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', f);

      const endpoint =
        mode === 'prescription'
          ? '/api/rxnorm/normalize-pdf'
          : '/api/reports/blood';

      const res = await fetch(endpoint, { method: 'POST', body: fd });
      const data = await safeJson(res);
      setResult(data);
    } catch (err: any) {
      setResult({ ok: false, error: String(err?.message || err) });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div
      style={{
        border: '1px solid var(--border, #ddd)',
        borderRadius: 12,
        padding: 16,
        display: 'grid',
        gap: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setMode('prescription')}
            aria-pressed={mode === 'prescription'}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border:
                mode === 'prescription'
                  ? '2px solid #555'
                  : '1px solid #ccc',
              background:
                mode === 'prescription' ? 'var(--btn, #f5f5f5)' : 'white',
              cursor: 'pointer',
            }}
          >
            Prescription
          </button>
          <button
            type="button"
            onClick={() => setMode('blood')}
            aria-pressed={mode === 'blood'}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: mode === 'blood' ? '2px solid #555' : '1px solid #ccc',
              background: mode === 'blood' ? 'var(--btn, #f5f5f5)' : 'white',
              cursor: 'pointer',
            }}
          >
            Blood Report
          </button>
        </div>

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: 8,
            cursor: 'pointer',
            background: busy ? '#f0f0f0' : 'white',
            opacity: busy ? 0.7 : 1,
          }}
        >
          <span>{busy ? 'Processing…' : 'Upload PDF'}</span>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={onPick}
            style={{ display: 'none' }}
            disabled={busy}
          />
        </label>
      </div>

      {result && (
        <div
          style={{
            border: '1px solid #eee',
            borderRadius: 8,
            padding: 12,
            background: 'var(--panel, #fafafa)',
          }}
        >
          {!result.ok && (
            <p style={{ color: '#b00', margin: 0 }}>
              ⚠️ {result.error || 'Upload failed'}
            </p>
          )}

          {result.ok && mode === 'prescription' && (
            <div>
              <h3 style={{ margin: '0 0 8px' }}>Prescription parsed</h3>
              {result.note && (
                <p style={{ margin: '0 0 8px', color: '#555' }}>{result.note}</p>
              )}
              {Array.isArray(result.meds) && result.meds.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {result.meds.map((m: any) => (
                    <li key={m.rxcui}>
                      <strong>{m.token}</strong> → RXCUI:{' '}
                      <code>{m.rxcui}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0 }}>No medicines detected.</p>
              )}
            </div>
          )}

          {result.ok && mode === 'blood' && (
            <div>
              <h3 style={{ margin: '0 0 8px' }}>Blood report summary</h3>
              {result.summary && (
                <p style={{ margin: '0 0 8px' }}>{result.summary}</p>
              )}
              {Array.isArray(result.values) && result.values.length > 0 ? (
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 14,
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: 'left',
                          borderBottom: '1px solid #eee',
                          padding: '6px 4px',
                        }}
                      >
                        Test
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          borderBottom: '1px solid #eee',
                          padding: '6px 4px',
                        }}
                      >
                        Value
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          borderBottom: '1px solid #eee',
                          padding: '6px 4px',
                        }}
                      >
                        Reference
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          borderBottom: '1px solid #eee',
                          padding: '6px 4px',
                        }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.values.map((v: any, idx: number) => (
                      <tr key={idx}>
                        <td
                          style={{
                            borderBottom: '1px solid #f2f2f2',
                            padding: '6px 4px',
                          }}
                        >
                          {v.label || v.key}
                        </td>
                        <td
                          style={{
                            borderBottom: '1px solid #f2f2f2',
                            padding: '6px 4px',
                          }}
                        >
                          {v.value} {v.unit || ''}
                        </td>
                        <td
                          style={{
                            borderBottom: '1px solid #f2f2f2',
                            padding: '6px 4px',
                            color: '#555',
                          }}
                        >
                          {v.ref
                            ? `${v.ref.min}–${v.ref.max} ${v.ref.unit}`
                            : '—'}
                        </td>
                        <td
                          style={{
                            borderBottom: '1px solid #f2f2f2',
                            padding: '6px 4px',
                          }}
                        >
                          {v.status === 'high' && 'High'}
                          {v.status === 'low' && 'Low'}
                          {v.status === 'normal' && 'Normal'}
                          {v.status === 'unknown' && 'Unknown'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ margin: 0 }}>No recognizable lab values found.</p>
              )}
              {result.disclaimer && (
                <p style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                  {result.disclaimer}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
