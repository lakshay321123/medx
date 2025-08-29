'use client';

import { useState } from 'react';

export type Med = { token: string; rxcui: string; term?: string; cui?: string };

export default function PrescriptionChecker() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [meds, setMeds] = useState<Med[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState(''); // NEW: manual fallback

  async function processFile() {
    if (!file) return;
    setLoading(true);
    setText('');
    setMeds([]);
    setInteractions([]);
    setNote(null);

    let extractedText = '';
    let medsFound: Med[] = [];

    try {
      if (file.type === 'application/pdf') {
        // PDF path (unchanged)
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch('/api/rxnorm/normalize-pdf', { method: 'POST', body: fd });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || 'PDF parse error');
        extractedText = j.text || '';
        medsFound = j.meds || [];
        if (j.note) setNote(j.note);
      } else {
        // IMAGE path → use server OCR (better handwriting support)
        const fd = new FormData();
        fd.append('file', file);
        const o = await fetch('/api/ocr', { method: 'POST', body: fd });
        const oj = await o.json();
        if (!o.ok) throw new Error(oj?.error || 'OCR failed');
        extractedText = String(oj.text || '').trim();

        // If OCR is very short, suggest manual entry
        if (extractedText.length < 20) {
          setNote('OCR was low quality. Please type the medication names below, one per line.');
        }

        // Normalize to RxNorm
        const rxRes = await fetch('/api/rxnorm/normalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: extractedText })
        });
        const rx = await rxRes.json();
        medsFound = rx.meds || [];
      }

      // Enrich with UMLS (best-effort)
      const enriched: Med[] = [];
      for (const m of medsFound) {
        try {
          const r = await fetch(`/api/umls/drug-to-rxnorm?q=${encodeURIComponent(m.token)}`);
          const j = await r.json();
          enriched.push({ ...m, cui: j.cui || undefined, term: m.token });
        } catch {
          enriched.push(m);
        }
      }

      setText(extractedText);
      setMeds(enriched);

      if (enriched.length >= 2) {
        const r = await fetch('/api/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rxcuis: enriched.map(m => m.rxcui) })
        });
        const j = await r.json();
        setInteractions(j.interactions || []);
      }
    } catch (e: any) {
      setNote(String(e?.message || e) || 'Processing failed');
    } finally {
      setLoading(false);
    }
  }

  // NEW: let users type meds when OCR fails
  async function processManual() {
    const text = manual.split('\n').join(' ');
    const rxRes = await fetch('/api/rxnorm/normalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const rx = await rxRes.json();
    setMeds(rx.meds || []);
    setText(text);
    setInteractions([]);
    if ((rx.meds || []).length >= 2) {
      const r = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rxcuis: (rx.meds || []).map((m: any) => m.rxcui) })
      });
      const j = await r.json();
      setInteractions(j.interactions || []);
    }
  }

  // UI
  return (
    <section className="response" style={{ marginTop: 16 }}>
      <div className="inputRow">
        <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
        <button className="btn" onClick={processFile} disabled={!file || loading}>
          {loading ? 'Processing…' : 'Check'}
        </button>
      </div>
      {note && <p className="muted" style={{ marginTop: 8 }}>{note}</p>}

      {/* Manual fallback box */}
      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 13, color: 'var(--muted)' }}>
          If OCR is unclear, type medication names here (one per line), then click “Use typed meds”.
        </label>
        <div className="inputRow" style={{ marginTop: 6 }}>
          <textarea
            placeholder={'e.g.\nUltracet\nRabeprazole\nDiclofenac'}
            value={manual}
            onChange={e => setManual(e.target.value)}
            rows={4}
          />
          <button className="iconBtn" onClick={processManual} aria-label="Use typed meds">OK</button>
        </div>
      </div>

      {text && (
        <div style={{ marginTop: 12 }}>
          <div className="muted" style={{ marginBottom: 4 }}>Extracted text</div>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{text}</pre>
        </div>
      )}

      {meds.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="muted" style={{ marginBottom: 4 }}>Medications</div>
          <ul>
            {meds.map((m, i) => (
              <li key={i}>
                {m.term || m.token} (RXCUI: {m.rxcui}{m.cui ? `, CUI: ${m.cui}` : ''})
              </li>
            ))}
          </ul>
        </div>
      )}

      {interactions.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="muted" style={{ marginBottom: 4 }}>Interactions</div>
          <ul>
            {interactions.map((int, i) => (
              <li key={i}>{JSON.stringify(int)}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

