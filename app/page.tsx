'use client';
import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Markdown from '../components/Markdown';
import { Send, Sun, Moon, User, Stethoscope } from 'lucide-react';

type ChatMsg = { role: 'user'|'assistant'; content: string };

export default function Home(){
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'patient'|'doctor'>('patient');
  const [theme, setTheme] = useState<'dark'|'light'>('dark');
  const [busy, setBusy] = useState(false);
  const [coords, setCoords] = useState<{lat:number; lng:number} | null>(null);            // ← NEW
  const [locNote, setLocNote] = useState<string | null>(null);                            // ← NEW
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ document.documentElement.className = theme==='light'?'light':''; },[theme]);
  useEffect(()=>{ document.body.setAttribute('data-role', mode==='doctor'?'doctor':''); },[mode]);
  useEffect(()=>{ chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }); },[messages]);

  // NEW: ask browser for location
  async function requestLocation() {
    setLocNote(null);
    if (!('geolocation' in navigator)) {
      setLocNote('Location not available in this browser. Type your city, e.g., "pharmacy near Connaught Place, Delhi".');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos)=>{
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocNote('Location set.');
        setTimeout(()=>setLocNote(null), 2000);
      },
      (err)=>{
        setLocNote('Please allow location access to find places near you, or type your city in the query.');
        console.warn('geolocation error', err);
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
    );
  }

  async function send(text: string){
    if(!text.trim() || busy) return;
    setBusy(true);

    try {
      const planRes = await fetch('/api/medx', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ query: text, mode, coords }) // ← include coords
      });
      if (!planRes.ok) throw new Error(`MedX API error ${planRes.status}`);
      const plan = await planRes.json();

      // If router needs location, show a helpful tip bubble immediately
      if (plan.intent === 'NEARBY' && plan.sections?.needsLocation) {
        setMessages(prev=>[...prev,
          { role:'assistant', content:
            `I can find **${plan.sections.kind || 'places'} near you**.\n\n` +
            `• Click **Set location** (below) to allow location access, then ask again.\n` +
            `• Or type a place, e.g., *"pharmacy near Connaught Place, Delhi"*.` }
        ]);
      }

      const sys = mode==='doctor'
        ? `You are a clinical assistant. Write clean markdown with headings and bullet lists.
If CONTEXT has codes, interactions, trials, or nearby places, summarize and add clickable links. Avoid medical advice.`
        : `You are a patient-friendly explainer. Use simple markdown and short paragraphs.
If CONTEXT has codes, trials, or nearby places, explain plainly and add links. Avoid medical advice.`;

      const contextBlock = "CONTEXT:\n" + JSON.stringify(plan.sections || {}, null, 2);

      setMessages(prev=>[...prev, { role:'user', content:text }, { role:'assistant', content:'' }]);
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
                copy[copy.length-1] = { role:'assistant', content: acc };
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
          {/* Chat messages */}
          <div ref={chatRef} style={{flex:1, overflowY:'auto'}}>
            {messages.map((m,i)=> (
              <div key={i} className={`msg ${m.role}`}> <Markdown>{m.content}</Markdown> </div>
            ))}
          </div>

          {/* Input area */}
          <div className="inputDock">
            <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask..." />
            <button onClick={()=>send(input)} disabled={busy}><Send size={16}/></button>
          </div>

          {/* Location button row */}
          <div style={{ marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <button className="item" onClick={requestLocation}>📍 Set location</button>
            {locNote && <span style={{ color:'var(--muted)', fontSize:12 }}>{locNote}</span>}
          </div>
        </div>
      </main>
    </div>
  );
}
