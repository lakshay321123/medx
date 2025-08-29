'use client';
import { useEffect, useState } from 'react';

type BannerItem = { title:string; source:string; time:string; url:string };

export default function Home(){
  const [term,setTerm]=useState('thyroid cancer');
  const [role,setRole]=useState<'patient'|'clinician'>('patient');
  const [answer,setAnswer]=useState('');
  const [loading,setLoading]=useState(false);
  const [banner,setBanner]=useState<BannerItem[]>([]);
  const [coords, setCoords] = useState<{lat:number; lng:number} | null>(null);
  const [locNote, setLocNote] = useState<string | null>(null);
  const [followups, setFollowups] = useState<string[]>([]);

  const nearbyOn = process.env.NEXT_PUBLIC_FEATURE_NEARBY === 'on';

  useEffect(()=>{ fetch('/api/banner').then(r=>r.json()).then(setBanner).catch(()=>{}); },[]);

  function saveCoords(c:{lat:number;lng:number}) {
    setCoords(c);
    try { localStorage.setItem('medx_coords', JSON.stringify(c)); } catch {}
  }

  async function loadSavedCoords() {
    try {
      const s = localStorage.getItem('medx_coords');
      if (s) setCoords(JSON.parse(s));
    } catch {}
  }

  async function requestLocation(auto=false): Promise<{lat:number;lng:number}|null> {
    setLocNote(auto ? 'Setting location…' : null);
    const useIPFallback = async (): Promise<{lat:number;lng:number}|null> => {
      try {
        const r = await fetch('/api/locate'); const j = await r.json();
        if (j?.lat && j?.lng) { const c={ lat: j.lat, lng: j.lng }; saveCoords(c); setLocNote(`Location set${j.city ? `: ${j.city}` : ''}.`); return c; }
      } catch {}
      setLocNote('Location unavailable. You can still type a place, e.g., "pharmacy near Connaught Place".');
      return null;
    };

    if (!('geolocation' in navigator)) return useIPFallback();
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        (pos)=>{ const c={ lat: pos.coords.latitude, lng: pos.coords.longitude }; saveCoords(c); setLocNote('Location set.'); setTimeout(()=>setLocNote(null), 1500); resolve(c); },
        async ()=>{ const c=await useIPFallback(); resolve(c); },
        { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 }
      );
    });
  }

  useEffect(()=>{ loadSavedCoords().then(()=>requestLocation(true)); },[]);

  async function ask(text=term){
    setLoading(true);
    setAnswer('');
    let currentCoords = coords;
    if(/near (me|by)/i.test(text) && !currentCoords){
      currentCoords = await requestLocation(false);
      if(!currentCoords){
        setAnswer('Location unavailable');
        setLoading(false);
        return;
      }
    }
    const body:any = { q: text, role };
    if(nearbyOn && currentCoords) body.coords = currentCoords;
    const r = await fetch('/api/medx',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
    const json = await r.json();
    setFollowups(Array.isArray(json.followups) ? json.followups : []);
    if(json.sections?.nearby){
      setAnswer(JSON.stringify(json.sections.nearby, null, 2));
    }else if(json.answer){
      setAnswer(json.answer);
    }else if(json.sections?.needsLocation){
      setAnswer('Location required');
    }else if(json.sections?.nearby?.disabled){
      setAnswer('Nearby search disabled');
    }else{
      setAnswer('');
    }
    setLoading(false);
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
          <button className="btn primary" onClick={()=>ask()} disabled={loading}>{loading?'Thinking…':'Ask'}</button>
        </div>
        {nearbyOn && (
          <div style={{ marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <button className="item" onClick={()=>requestLocation(false)}>📍 Set location</button>
            {locNote && <span style={{ color:'var(--muted)', fontSize:12 }}>{locNote}</span>}
          </div>
        )}
        <pre style={{whiteSpace:'pre-wrap', marginTop:12}}>{answer}</pre>
        {followups.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, margin:'8px 0 4px 0' }}>
            {followups.map((f,i)=>(
              <button key={i} className="item" onClick={()=>{ setTerm(f); ask(f); }}>{f}</button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
