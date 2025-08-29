'use client';
import { useEffect, useState } from 'react';

type BannerItem = { title:string; source:string; time:string; url:string };

export default function Home(){
  const [term,setTerm]=useState('thyroid cancer');
  const [role,setRole]=useState<'patient'|'clinician'>('patient');
  const [answer,setAnswer]=useState('');
  const [loading,setLoading]=useState(false);
  const [banner,setBanner]=useState<BannerItem[]>([]);
  const [pendingMeds, setPendingMeds] = useState<{token:string;rxcui:string}[]|null>(null);

  useEffect(()=>{ fetch('/api/banner').then(r=>r.json()).then(setBanner).catch(()=>{}); },[]);

  function MedsReview({ meds, onConfirm, onCancel }:{ meds:{token:string;rxcui:string}[]; onConfirm:(m:{token:string;rxcui:string}[])=>void; onCancel:()=>void }) {
    const [list, setList] = useState(meds);
    return (
      <div className="bubble" style={{ border:'1px dashed var(--border)' }}>
        <div className="role">Check recognized medications</div>
        {list.map((m, i)=>(
          <div key={i} style={{ display:'flex', gap:8, alignItems:'center', margin:'6px 0' }}>
            <input
              value={m.token}
              onChange={e=>{
                const copy=[...list]; copy[i]={...copy[i], token:e.target.value}; setList(copy);
              }}
              style={{ flex:1, padding:'6px 8px', border:'1px solid var(--border)', borderRadius:8, background:'transparent', color:'inherit' }}
            />
            <a href={`https://rxnav.nlm.nih.gov/REST/rxcui/${m.rxcui}`} target="_blank" rel="noreferrer" style={{ color:'var(--accent)' }}>
              {m.rxcui}
            </a>
            <button className="item" onClick={()=>{ const copy=[...list]; copy.splice(i,1); setList(copy); }}>Remove</button>
          </div>
        ))}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
          <button className="item" onClick={onCancel}>Cancel</button>
          <button className="item" onClick={()=>onConfirm(list)}>Confirm</button>
        </div>
      </div>
    );
  }

  async function ask(){
    setLoading(true);
    setAnswer('');
    const r = await fetch('/api/chat',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ role, question: term })});
    const txt = await r.text();
    setAnswer(txt);
    setLoading(false);
  }

  async function handleUpload(file: File){
    // Placeholder OCR flow
    const meds: {token:string;rxcui:string}[] = [];
    setPendingMeds(meds);
    setAnswer(`Parsed **${file.name}**.\n\nRecognized **${meds.length}** medication name(s). Please review below.`);
  }

  return (
    <main className="container">
      <div className="toggle">
        <select onChange={e=>document.documentElement.className = e.target.value==='light'?'light':''} className="btn">
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>
      <h1>MedX</h1>
      <p className="muted">Global medical companion • Patient/Clinician dual answers • Secure by design</p>

      <section className="card" style={{marginTop:12}}>
        <div className="row" style={{justifyContent:'space-between'}}>
          <div className="headline">Latest trusted updates</div>
          <a className="muted" href="/api/banner" target="_blank">See JSON</a>
        </div>
        <div className="row" style={{marginTop:8, overflowX:'auto'}}>
          {banner.slice(0,6).map((b,i)=>(
            <a key={i} href={b.url} target="_blank" className="card" style={{minWidth:260}}>
              <div className="muted">{b.source} • {b.time}</div>
              <div>{b.title}</div>
            </a>
          ))}
        </div>
      </section>

      <section style={{marginTop:16}} className="card">
        <div className="row">
          <input value={term} onChange={e=>setTerm(e.target.value)} style={{flex:1, padding:12, borderRadius:8, border:'1px solid #22304a', background:'transparent', color:'inherit'}} placeholder="Ask MedX… (e.g., best trials for thyroid cancer in India)" />
          <select value={role} onChange={e=>setRole(e.target.value as any)} className="btn">
            <option value="patient">Patient view</option>
            <option value="clinician">Clinician view</option>
          </select>
          <button className="btn primary" onClick={ask} disabled={loading}>{loading?'Thinking…':'Ask'}</button>
        </div>
        <pre style={{whiteSpace:'pre-wrap', marginTop:12}}>{answer}</pre>
      </section>
    </main>
  );
}
