'use client';
import { useState } from 'react';

export default function ConceptMapper() {
  const [q, setQ] = useState('hypothyroidism');
  const [results, setResults] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<'ICD10CM' | 'SNOMEDCT_US' | 'RXNORM'>('ICD10CM');

  async function search() {
    setLoading(true);
    setMappings([]); setResults([]);
    const r = await fetch(`/api/umls/search?q=${encodeURIComponent(q)}`);
    const j = await r.json();
    setResults(j.results || []);
    setLoading(false);
  }

  async function xwalk(cui: string) {
    setLoading(true);
    const r = await fetch(`/api/umls/crosswalk?cui=${encodeURIComponent(cui)}&target=${target}`);
    const j = await r.json();
    setMappings(j.mappings || []);
    setLoading(false);
  }

  return (
    <section className="response" style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>Concept Mapper (UMLS)</h3>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="term or diagnosis…" />
        <select value={target} onChange={e=>setTarget(e.target.value as any)} className="pill">
          <option value="ICD10CM">ICD-10-CM</option>
          <option value="SNOMEDCT_US">SNOMED CT (US)</option>
          <option value="RXNORM">RxNorm</option>
        </select>
        <button className="item" onClick={search} disabled={loading}>{loading?'…':'Search'}</button>
      </div>

      {!!results.length && <>
        <h4>UMLS CUIs</h4>
        <ul>
          {results.map((r:any,i:number)=>(
            <li key={i}>
              <code>{r.ui}</code> — {r.name} <small>({r.rootSource})</small>{' '}
              <button className="pill" onClick={()=>xwalk(r.ui)} disabled={loading}>Crosswalk</button>
            </li>
          ))}
        </ul>
      </>}

      {!!mappings.length && <>
        <h4>Crosswalk → {target}</h4>
        <ul>
          {mappings.map((m:any,i:number)=>(
            <li key={i}><b>{m.code || '—'}</b> — {m.term} <small>({m.tty})</small></li>
          ))}
        </ul>
      </>}
    </section>
  );
}
