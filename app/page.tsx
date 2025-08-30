'use client';
import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Markdown from '../components/Markdown';
import { Send, Sun, Moon, User, Stethoscope } from 'lucide-react';
import { parseNearbyIntent } from '@/lib/intent';
import NearbyCards from '@/components/NearbyCards';

type ChatMsg = {
  role: 'user' | 'assistant';
  content?: string;
  type?: 'note' | 'nearby-cards';
  payload?: any;
};

export default function Home(){
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'patient'|'doctor'>('patient');
  const [theme, setTheme] = useState<'dark'|'light'>('dark');
  const [busy, setBusy] = useState(false);
  const [coords, setCoords] = useState<{lat:number; lng:number} | null>(null);
  const [locNote, setLocNote] = useState<string | null>(null);
  const [followups, setFollowups] = useState<string[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

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

  async function requestLocation(auto=false) {
    setLocNote(auto ? 'Setting location…' : null);
    const useIPFallback = async () => {
      try {
        const r = await fetch('/api/locate'); const j = await r.json();
        if (j?.lat && j?.lng) { saveCoords({ lat: j.lat, lng: j.lng }); setLocNote(`Location set${j.city ? `: ${j.city}` : ''}.`); return; }
      } catch {}
      setLocNote('Location unavailable. You can still type a place, e.g., "pharmacy near Connaught Place".');
    };

    if (!('geolocation' in navigator)) return useIPFallback();
    navigator.geolocation.getCurrentPosition(
      (pos)=>{ saveCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocNote('Location set.'); setTimeout(()=>setLocNote(null), 1500); },
      async ()=>{ await useIPFallback(); },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 }
    );
  }

  useEffect(()=>{ document.documentElement.className = theme==='light'?'light':''; },[theme]);
  useEffect(()=>{ document.body.setAttribute('data-role', mode==='doctor'?'doctor':''); },[mode]);
  useEffect(()=>{ chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }); },[messages]);
  useEffect(()=>{ loadSavedCoords().then(()=>requestLocation(true)); },[]);

  const showHero = messages.length===0;

  function buildMessages(userText: string) {
    return [...messages.map(m => ({ role: m.role, content: m.content || '' })), { role: 'user', content: userText }];
  }

  async function sendToLLM(userText: string, meta?: any) {
    const res = await fetch('/api/medx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: buildMessages(userText), meta }),
    });

    let payload: any = null;
    try { payload = await res.json(); }
    catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', type: 'note', content: 'Sorry — I could not process that response. Please try again.' },
      ]);
      return;
    }

    if (!payload?.ok) {
      const msg = payload?.error?.message || 'The AI service returned an error.';
      setMessages(prev => [
        ...prev,
        { role: 'assistant', type: 'note', content: `⚠️ ${msg}` },
      ]);
      return;
    }

    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: payload.data.content },
    ]);

    if (payload.data.citations?.length) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          type: 'note',
          content: payload.data.citations.map((c: any) => `[${c.title || 'Source'}](${c.url})`).join('\n'),
        },
      ]);
    }
  }

  async function send(text: string){
    if(!text.trim() || busy) return;

  const intent = parseNearbyIntent(text);
  if (intent.type === 'nearby') {
    setMessages(prev => [
      ...prev,
      { role: 'user', content: text } as ChatMsg,
      ...(intent.corrected && intent.suggestion
        ? [{ role: 'assistant', type: 'note', content: `Did you mean **${intent.suggestion.replace(' near me','')}** near you?
Okay — searching ${intent.suggestion}…` } as ChatMsg]
        : []),
    ]);
    setInput('');
    setBusy(true);
    try {
      let lat: number | undefined, lon: number | undefined;
      try {
        const p = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation
            ? navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 })
            : reject(new Error('no geo'))
        );
        lat = p.coords.latitude; lon = p.coords.longitude;
      } catch {}

      const params = new URLSearchParams({
        kind: intent.kind,
        ...(intent.specialty ? { specialty: intent.specialty } : {}),
        ...(lat && lon ? { lat: String(lat), lon: String(lon) } : {}),
      });
      const res = await fetch(`/api/nearby?${params.toString()}`);
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.items?.length) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', type: 'note', content: 'No matching places found. Try widening the radius or tap **Set location**.' },
        ]);
        return;
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          type: 'nearby-cards',
          payload: data.items.map((it: any) => ({
            title: it.name,
            subtitle: prettyType(it.type),
            address: it.address,
            phone: it.phone,
            website: it.website,
            mapsUrl: `https://www.google.com/maps?q=${it.lat},${it.lon}`,
            distanceKm:
              typeof it.distance_km === 'number' ? it.distance_km : undefined,
          })),
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', type: 'note', content: 'No matching places found. Try widening the radius or tap **Set location**.' },
      ]);
    } finally {
      setBusy(false);
    }
    return;
  }

    setBusy(true);
    setMessages(prev=>[...prev, { role:'user', content:text }]);
    setInput('');
    await sendToLLM(text, { mode, coords });
    setBusy(false);
  }

  async function handleUpload(file: File) {
    if (!file) return;
    setBusy(true);

    try {
      const idx = messages.length;
      setMessages(prev=>[...prev, { role:'assistant', content:`Processing "${file.name}"…` }]);

      let extractedText = '';
      if (file.type === 'application/pdf') {
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch('/api/rxnorm/normalize-pdf', { method: 'POST', body: fd });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || 'PDF parse error');
        extractedText = String(j.text || '').trim();
      } else {
        const fd = new FormData();
        fd.append('file', file);
        const o = await fetch('/api/ocr', { method: 'POST', body: fd });
        const oj = await o.json();
        if (!o.ok) throw new Error(oj?.error || 'OCR failed');
        extractedText = String(oj.text || '').trim();
      }

      const rxRes = await fetch('/api/rxnorm/normalize', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ text: extractedText })
      });
      const rx = await rxRes.json();
      const meds = rx.meds || [];

      let interactions: any[] = [];
      if (meds.length >= 2) {
        const r = await fetch('/api/interactions', {
          method:'POST', headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ rxcuis: meds.map((m:any)=>m.rxcui) })
        });
        const j = await r.json();
        interactions = j.interactions || [];
      }

      const lines: string[] = [];
      lines.push(`**Prescription analysis – ${file.name}**`);
      if (extractedText) {
        lines.push(`<details><summary>Extracted text</summary>\n\n${extractedText.slice(0,2000)}\n\n</details>`);
      }
      if (meds.length) {
        lines.push('**Recognized medications (RxNorm):**');
        meds.forEach((m:any)=> lines.push(`- ${m.token} — RXCUI [${m.rxcui}](https://rxnav.nlm.nih.gov/REST/rxcui/${m.rxcui})`));
      } else {
        lines.push('No medications confidently recognized. You can type them manually (one per line).');
      }
      if (interactions.length) {
        lines.push('\n**Potential interactions:**');
        interactions.forEach((it:any)=> lines.push(`- **${it.severity || 'Severity N/A'}** — ${it.description}`));
      }

      setMessages(prev=>{
        const copy = [...prev];
        copy[idx] = { role:'assistant', content: lines.join('\n') };
        return copy;
      });
    } catch (e:any) {
      console.error(e);
      setMessages(prev=>[...prev, { role:'assistant', content:`⚠️ Upload failed: ${String(e?.message || e)}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <Sidebar onNew={()=>{ setMessages([]); setInput(''); }} onSearch={()=>{}} />

      <main className="main">
        <div className="header">
          <button className="item" onClick={()=>setMode(mode==='patient'?'doctor':'patient')}>
            {mode==='patient'? <><User size={16}/> Patient</> : <><Stethoscope size={16}/> Doctor</>}
          </button>
          <button className="item" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>
            {theme==='dark'? <><Sun size={16}/> Light</> : <><Moon size={16}/> Dark</>}
          </button>
        </div>

        <div className="wrap">
          {messages.length===0 ? (
            <div className="hero">
              <h1>MedX</h1>
              <p>Ask anything medical. Switch to Doctor for clinical depth.</p>
              <div className="inputRow" style={{ marginTop:16 }}>
                <textarea
                  placeholder="Type your question…"
                  value={input}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(input);} }}
                />
                <button className="iconBtn" onClick={()=>send(input)} aria-label="Send" disabled={busy}><Send size={18}/></button>
              </div>
              <div style={{ marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <button className="item" onClick={()=>requestLocation(false)}>📍 Set location</button>
                {locNote && <span style={{ color:'var(--muted)', fontSize:12 }}>{locNote}</span>}
              </div>
              <div style={{ marginTop:10, textAlign:'right' }}>
                <label className="item" style={{ cursor:'pointer' }}>
                  📄 Upload Prescription
                  <input
                    type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:'none' }}
                    onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleUpload(f); e.currentTarget.value=''; }}
                  />
                </label>
              </div>
            </div>
          ) : (
            <>
              <div ref={chatRef} className="chat">
                {messages.map((m,i)=>(
                  <div key={i} className={`msg ${m.role}`}>
                    <div className="avatar">{m.role==='user'?'U':'M'}</div>
                    <div className="bubble">
                      <div className="role">{m.role==='user'?'You':'MedX'}</div>
                      <div className="content">
                        {m.type === 'nearby-cards' ? (
                          <NearbyCards items={m.payload} />
                        ) : (
                          <div className="markdown"><Markdown text={m.content || ''}/></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {followups.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, margin:'8px 0 4px 0' }}>
                  {followups.map((f, i)=>(
                    <button key={i} className="item" onClick={()=>send(f)}>{f}</button>
                  ))}
                </div>
              )}

              <div className="inputDock">
                <div className="inputRow">
                  <textarea
                    placeholder="Send a message…"
                    value={input}
                    onChange={e=>setInput(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(input);} }}
                  />
                  <button className="iconBtn" onClick={()=>send(input)} aria-label="Send" disabled={busy}>➤</button>
                </div>
                <div style={{ marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <button className="item" onClick={()=>requestLocation(false)}>📍 Set location</button>
                  {locNote && <span style={{ color:'var(--muted)', fontSize:12 }}>{locNote}</span>}
                </div>
                <div style={{ marginTop:8, textAlign:'right' }}>
                  <label className="item" style={{ cursor:'pointer' }}>
                    📄 Upload Prescription
                    <input
                      type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:'none' }}
                      onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleUpload(f); e.currentTarget.value=''; }}
                    />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function prettyType(t?: string) {
  if (!t) return '';
  const s = String(t).toLowerCase();
  if (s === 'doctors' || s === 'doctor') return 'Doctor';
  if (s === 'clinic') return 'Clinic';
  if (s === 'hospital') return 'Hospital';
  if (s === 'pharmacy') return 'Pharmacy';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
