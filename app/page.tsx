'use client';
import { useEffect, useState } from 'react';

type BannerItem = { title:string; source:string; time:string; url:string };

export default function Home(){
  const [term,setTerm]=useState('thyroid cancer');
  const [role,setRole]=useState<'patient'|'clinician'>('patient');
  const [answer,setAnswer]=useState('');
  const [loading,setLoading]=useState(false);
  const [banner,setBanner]=useState<BannerItem[]>([]);
  const [coords,setCoords]=useState<{lat:number,lng:number}|null>(null);
  const [locNote,setLocNote]=useState('');

  const nearbyOn = process.env.NEXT_PUBLIC_FEATURE_NEARBY === 'on';

  useEffect(()=>{ fetch('/api/banner').then(r=>r.json()).then(setBanner).catch(()=>{}); },[]);

  function requestLocation(){
    if(!navigator.geolocation){
      setLocNote('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos=>{
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocNote('Location set');
      },
      ()=>setLocNote('Location denied')
    );
  }

  async function ask(){
    setLoading(true);
    setAnswer('');
    const body:any = { q: term, role };
    if(nearbyOn && coords) body.coords = coords;
    const r = await fetch('/api/medx',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
    const json = await r.json();
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
          <button className="btn primary" onClick={ask} disabled={loading}>{loading?'Thinking…':'Ask'}</button>
        </div>
        {nearbyOn && (
          <div style={{ marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <button className="item" onClick={requestLocation}>📍 Set location</button>
            {locNote && <span style={{ color:'var(--muted)', fontSize:12 }}>{locNote}</span>}
          </div>
        )}
        <pre style={{whiteSpace:'pre-wrap', marginTop:12}}>{answer}</pre>
      </section>
    </main>
  );
}
