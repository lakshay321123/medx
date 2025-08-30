'use client';
import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Markdown from '../components/Markdown';
import { Send, Sun, Moon, User, Stethoscope } from 'lucide-react';
import { NearbyCards } from '../components/NearbyCards';
import { inferIntentAndSlots } from '@/lib/nlu';
import { clarificationPrompt, confirmLine, followUps } from '@/lib/dialogue';
import { useLocale } from '@/lib/locale';
import FollowUpChips from '../components/FollowUpChips';

type ChatMsg = {
  role: 'user' | 'assistant';
  content?: string;
  type?: 'note' | 'nearby-cards' | 'chips';
  payload?: any;
  chips?: string[];
};

export default function Home(){
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'patient'|'doctor'>('patient');
  const [theme, setTheme] = useState<'dark'|'light'>('dark');
  const [busy, setBusy] = useState(false);
  const [coords, setCoords] = useState<{lat:number; lng:number} | null>(null);
  const [locNote, setLocNote] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();

  function addAssistantMessage(m: Omit<ChatMsg,'role'>){
    setMessages(prev=>[...prev, { role:'assistant', ...m }]);
  }

  function prettyType(s?: string){
    if(!s) return '';
    return s.split('_').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
  }

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

  async function send(text: string){
    if(!text.trim() || busy) return;

    setMessages(prev=>[...prev, { role:'user', content:text }]);
    setInput('');

    const state = inferIntentAndSlots(mode, text, locale.countryCode);

    const clarify = clarificationPrompt(state);
    if (clarify) {
      addAssistantMessage({ type:'note', content: clarify, chips:['Gynecologist','Cardiologist','Orthopedic','Spine clinic'] });
      return;
    }

    const confirm = confirmLine(state);
    if (confirm) addAssistantMessage({ type:'note', content: confirm });

    setBusy(true);
    try {
      if (state.intent === 'nearby' || state.intent === 'doc_finder_spine_group') {
        let lat:number|undefined, lon:number|undefined;
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej)=>
            navigator.geolocation ? navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy:true, timeout:8000 }) : rej('no geo')
          );
          lat = pos.coords.latitude; lon = pos.coords.longitude;
        } catch {}
        const params = new URLSearchParams({
          kind: 'doctor',
          ...(state.slots.specialty ? { specialty: state.slots.specialty } : {}),
          ...(state.slots.specialtyGroup ? { specialtyGroup: state.slots.specialtyGroup } : {}),
          ...(lat && lon ? { lat:String(lat), lon:String(lon) } : {}),
        });
        const r = await fetch(`/api/nearby?${params.toString()}`);
        const j = await r.json();
        if (!r.ok || !j?.items?.length) {
          addAssistantMessage({ type:'note', content: `No matching places found. Try “Increase radius” or set a location.` });
        } else {
          addAssistantMessage({
            type:'nearby-cards',
            payload: j.items.map((it:any)=>({
              title: it.name,
              subtitle: prettyType(it.type),
              address: it.address || undefined,
              phone: it.phone || undefined,
              website: it.website || undefined,
              mapsUrl: `https://www.google.com/maps?q=${it.lat},${it.lon}`,
              distanceKm: typeof it.distance_km === 'number' ? it.distance_km : undefined,
            })),
            chips: followUps(state),
          });
        }
        return;
      }

      if (state.intent === 'clinical_trials') {
        await askTrials(state.slots.condition);
        addAssistantMessage({ type:'chips', payload: followUps(state) });
        return;
      }

      if (state.intent === 'medication_advice' || state.intent === 'condition_overview' || state.intent === 'unknown') {
        await sendToLLM(text, { countryCode: locale.countryCode, mode: state.mode, condition: state.slots.condition });
        addAssistantMessage({ type:'chips', payload: followUps(state) });
        return;
      }
    } catch (e:any) {
      console.error(e);
      addAssistantMessage({ content:`⚠️ ${String(e?.message || e)}` });
    } finally {
      setBusy(false);
    }
  }

  async function askTrials(condition?: string){
    if(!condition) {
      addAssistantMessage({ type:'note', content:'No condition specified.' });
      return;
    }
    addAssistantMessage({ type:'note', content:`Searching clinical trials for **${condition}**…` });
    try {
      const r = await fetch(`/api/trials?condition=${encodeURIComponent(condition)}`);
      const j = await r.json();
      if (!r.ok || !j?.items?.length) {
        addAssistantMessage({ type:'note', content:'No matching clinical trials found.' });
        return;
      }
      const lines = j.items.map((it:any)=>`- [${it.title}](${it.link}) — ${it.source}`);
      addAssistantMessage({ content: lines.join('\n') });
    } catch (e:any) {
      addAssistantMessage({ content:`⚠️ ${String(e?.message || e)}` });
    }
  }

  async function sendToLLM(query: string, meta: any){
    try {
      const res = await fetch('/api/medx', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ query, meta }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'LLM error');
      addAssistantMessage({ content: j.text });
    } catch(e:any){
      addAssistantMessage({ content:`⚠️ ${String(e?.message || e)}` });
    }
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
                        ) : m.type === 'chips' ? (
                          <FollowUpChips items={m.payload || []} onClick={t=>send(t)} />
                        ) : (
                          <div className="markdown"><Markdown text={m.content || ''}/></div>
                        )}
                        {m.chips && <FollowUpChips items={m.chips} onClick={t=>send(t)} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

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
