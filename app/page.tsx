'use client';
import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Markdown from '../components/Markdown';
import { Send, Sun, Moon, User, Stethoscope } from 'lucide-react';

type ChatMsg = { role: 'user'|'assistant'; content: string; trials?: Array<any> };

function TrialsBlock({ trials }: { trials: Array<any> }) {
  if (!Array.isArray(trials) || trials.length === 0) return null;
  return (
    <div style={{ marginTop: 8 }}>
      {trials.map((t, i) => (
        <div key={t.id || i} style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600 }}>{t.title}</div>
          {t.nctId && <div style={{ fontSize: 12, opacity: 0.8 }}>NCT: {t.nctId}</div>}
          {Array.isArray(t.eligibilityBullets) && t.eligibilityBullets.length > 0 && (
            <ul style={{ margin: '6px 0 4px 20px' }}>
              {t.eligibilityBullets.slice(0, 6).map((b: string, j: number) => <li key={j}>{b}</li>)}
            </ul>
          )}
          {t.link && (
            <a href={t.link} target="_blank" rel="noopener noreferrer" className="item">
              View on {t.source || 'source'}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

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

  async function send(text: string){
    if(!text.trim() || busy) return;
    setBusy(true);

    try {
      const planRes = await fetch('/api/medx', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ query: text, mode, coords })
      });
      if (!planRes.ok) throw new Error(`MedX API error ${planRes.status}`);
      const plan = await planRes.json();
      setFollowups(Array.isArray(plan.followups) ? plan.followups : []);
      const trials = Array.isArray(plan.sections?.trials) ? plan.sections.trials : [];

      const sys = mode==='doctor'
        ? `You are a clinical assistant. Write clean markdown with headings and bullet lists.
If CONTEXT has codes, interactions, or trials, summarize and add clickable links. Avoid medical advice.`
        : `You are a patient-friendly explainer. Use simple markdown and short paragraphs.
If CONTEXT has codes or trials, explain them in plain words and add links. Avoid medical advice.`;

      const contextBlock = "CONTEXT:\n" + JSON.stringify(plan.sections || {}, null, 2);

      setMessages(prev=>[...prev, { role:'user', content:text }, { role:'assistant', content:'', trials }]);
      setInput('');

      const res = await fetch('/api/chat/stream', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          messages:[
            { role:'system', content: sys },
            { role:'user', content: `${text}\n\n${contextBlock}` }
          ]
        })
      });
      if (!res.ok || !res.body) throw new Error(`Chat API error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream:true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          if (line.trim() === 'data: [DONE]') continue;
          try {
            const payload = JSON.parse(line.replace(/^data:\s*/, ''));
            const delta = payload?.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages(prev=>{
                const copy = [...prev];
                copy[copy.length-1] = { ...copy[copy.length-1], content: acc };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch (e:any) {
      console.error(e);
      setMessages(prev=>[...prev, { role:'assistant', content:`⚠️ ${String(e?.message || e)}` }]);
    } finally {
      setBusy(false);
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
                      <div className="content markdown"><Markdown text={m.content}/></div>
                      {m.trials && <TrialsBlock trials={m.trials} />}
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
