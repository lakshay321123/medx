'use client';
import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Markdown from '../components/Markdown';
import { Send, User, Stethoscope, ClipboardList, FlaskConical } from 'lucide-react';

type ChatMsg = { role: 'user'|'assistant'; content: string };

export default function Home(){
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'patient'|'doctor'|'admin'>('patient');
  const [busy, setBusy] = useState(false);
  const [researchMode, setResearchMode] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ document.body.setAttribute('data-role', mode==='doctor'? 'doctor' : mode==='admin' ? 'admin' : ''); },[mode]);
  useEffect(()=>{ chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }); },[messages]);

  const showHero = messages.length===0;

  async function send(text: string, researchMode: boolean){
    if(!text.trim() || busy) return;
    setBusy(true);

    try {
      const planRes = await fetch('/api/medx', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ query: text, mode, researchMode })
      });
      if (!planRes.ok) throw new Error(`MedX API error ${planRes.status}`);
      const plan = await planRes.json();

      const sys = mode==='doctor'
        ? `You are a clinical assistant. Write clean markdown with headings and bullet lists.
If CONTEXT has codes, interactions, or trials, summarize and add clickable links. Avoid medical advice.`
        : `You are a patient-friendly explainer. Use simple markdown and short paragraphs.
If CONTEXT has codes or trials, explain them in plain words and add links. Avoid medical advice.`;

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

  async function handleFile(file: File) {
    if (!file) return;
    setBusy(true);
    try {
      const idx = messages.length;
      setMessages(prev => [...prev, { role: 'assistant', content: `Analyzing "${file.name}"…` }]);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doctorMode', String(mode === 'doctor'));
      const res = await fetch('/api/analyze', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Analysis failed');
      let lines: string[] = [];
      if (data.type === 'pdf') {
        lines.push('**Patient Summary**');
        lines.push(data.patient);
        if (data.doctor) {
          lines.push('\n**Doctor Summary**');
          lines.push(data.doctor);
        }
      } else {
        lines.push('**Imaging Report**');
        lines.push(data.report);
      }
      if (data.disclaimer) {
        lines.push(`\n_${data.disclaimer}_`);
      }
      setMessages(prev => { const copy = [...prev]; copy[idx] = { role: 'assistant', content: lines.join('\n\n') }; return copy; });
    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${String(e?.message || e)}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <Sidebar onNew={()=>{ setMessages([]); setInput(''); }} onSearch={()=>{}} />

      <main className="main">
        <div className="header">
          <button className="item" onClick={()=>setMode(mode==='patient'?'doctor':mode==='doctor'?'admin':'patient')}>
            {mode==='patient'
              ? <><User size={16}/> Patient</>
              : mode==='doctor'
                ? <><Stethoscope size={16}/> Doctor</>
                : <><ClipboardList size={16}/> Admin</>}
          </button>
          <button className="item" onClick={()=>setResearchMode(r=>!r)}>
            {researchMode ? <><FlaskConical size={16}/> Research On</> : <><FlaskConical size={16}/> Research Off</>}
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
                  onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(input, researchMode);} }}
                />
                <button className="iconBtn" onClick={()=>send(input, researchMode)} aria-label="Send" disabled={busy}><Send size={18}/></button>
              </div>
              <div style={{ marginTop:10, textAlign:'right', display:'flex', justifyContent:'flex-end', gap:8 }}>
                <label className="item" style={{ cursor:'pointer' }}>
                  📄 Upload
                  <input
                    type="file" accept="application/pdf,image/*" style={{ display:'none' }}
                    onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleFile(f); e.currentTarget.value=''; }}
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
                    onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(input, researchMode);} }}
                  />
                  <button className="iconBtn" onClick={()=>send(input, researchMode)} aria-label="Send" disabled={busy}>➤</button>
                </div>
                <div style={{ marginTop:8, textAlign:'right', display:'flex', justifyContent:'flex-end', gap:8 }}>
                  <label className="item" style={{ cursor:'pointer' }}>
                    📄 Upload
                    <input
                      type="file" accept="application/pdf,image/*" style={{ display:'none' }}
                      onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleFile(f); e.currentTarget.value=''; }}
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
