'use client';
import { useState } from 'react';
import * as Tesseract from 'tesseract.js';
import Sources from './Sources';

type Med = { token: string; rxcui: string; cui?: string; term?: string };

export default function PrescriptionChecker() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [meds, setMeds] = useState<Med[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function processFile() {
    if (!file) return;
    setLoading(true);
    setText(''); setMeds([]); setInteractions([]); setNote(null);

    let extractedText = '';
    let medsFound: Med[] = [];

    try {
      if (file.type === 'application/pdf') {
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch('/api/rxnorm/normalize-pdf', { method: 'POST', body: fd });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || 'PDF parse error');
        extractedText = j.text || '';
        medsFound = j.meds || [];
        if (j.note) setNote(j.note);
      } else {
        const { data } = await Tesseract.recognize(file, 'eng', { logger: () => {} });
        extractedText = data.text || '';
        const rxRes = await fetch('/api/rxnorm/normalize', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: extractedText })
        });
        const rx = await rxRes.json();
        medsFound = rx.meds || [];
      }

      // Enrich with UMLS CUI (best-effort)
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

  const sources = [
    { label: 'RxNav Interactions', href: 'https://rxnav.nlm.nih.gov/InteractionAPIs.html' },
    { label: 'RxNorm API', href: 'https://rxnav.nlm.nih.gov/RxNormAPIs.html' },
    { label: 'UMLS', href: 'https://uts.nlm.nih.gov/' },
    { label: 'DailyMed', href: 'https://dailymed.nlm.nih.gov/dailymed/' }
  ];

  return (
    <section className="response" style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>Prescription Checker (PDF/Image → RxNorm + UMLS → Interactions)</h3>
      <p className="muted" style={{ marginTop: -8 }}>
        Upload a <strong>PDF</strong> or an <strong>image</strong>. We extract medication names,
        map to RxNorm & UMLS, and show potential interactions. Not medical advice.
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="file" accept="application/pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
        <button className="iconBtn" onClick={processFile} disabled={!file || loading}>
          {loading ? '…' : '▶'}
        </button>
      </div>

      {note && <p className="muted" style={{ marginTop: 8 }}>{note}</p>}

      {text && <>
        <h4>Extracted text</h4>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{text.trim()}</pre>
      </>}

      {!!meds.length && <>
        <h4>Recognized medications</h4>
        <ul>
          {meds.map((m, i) => (
            <li key={i}>
              {m.term || m.token} — RXCUI{' '}
              <a target="_blank" rel="noreferrer" href={`https://rxnav.nlm.nih.gov/REST/rxcui/${m.rxcui}`}>{m.rxcui}</a>
              {m.cui && <> • CUI <a target="_blank" rel="noreferrer" href={`https://uts.nlm.nih.gov/uts/umls/concept/${m.cui}`}>{m.cui}</a></>}
            </li>
          ))}
        </ul>
      </>}

      {!!interactions.length && <>
        <h4>Potential interactions</h4>
        <ul>
          {interactions.map((it, i) => (
            <li key={i}><strong>{it.severity || 'Severity: N/A'}</strong> — {it.description}</li>
          ))}
        </ul>
      </>}

      <Sources items={sources} />
    </section>
  );
}
