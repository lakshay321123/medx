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
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ document.documentElement.className = theme==='light'?'light':''; },[theme]);
  useEffect(()=>{ document.body.setAttribute('data-role', mode==='doctor'?'doctor':''); },[mode]);
  useEffect(()=>{ chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }); },[messages]);

  const showHero = messages.length===0;

  async function send(text: string){
    if(!text.trim()) return;

    // Ask orchestrator for structured sections
    const planRes = await fetch('/api/medx', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ query: text, mode })
    });
    const plan = await planRes.json();

    const sys = mode==='doctor'
      ? `You are a clinical assistant. Write clean markdown with headings, lists, and short paragraphs.
If CONTEXT includes codes, interactions, or trials, summarize and provide clickable links. No medical advice.`
      : `You are a patient-friendly educator. Use simple language, short paragraphs, and gentle tone.
If CONTEXT has codes or trials, explain in plain words and add links. No medical advice.`;

    const contextBlock = "CONTEXT:\n" + JSON.stringify(plan.sections || {}, null, 2);

    // push user + placeholder assistant
    setMessages(prev=>[...prev, { role:'user', content:text }, { role:'assistant', content:'' }]);
    setInput('');

    // Stream SSE and render only delta.content
    const res = await fetch('/api/chat/stream', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        messages:[
          { role:'system', content: sys },
          { role:'user', content: `${text}\n\n${contextBlock}` }
        ]
      })
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let acc = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream:true });
      // parse SSE: lines beginning with "data: "
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
        } catch {/* ignore */}
      }
    }
  }

  return (
    <div className="app">
      <Sidebar onNew={()=>{setMessages([]); setInput('');}}
               onSearch={()=>{}} />

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
          {showHero ? (
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
                <button className="iconBtn" onClick={()=>send(input)} aria-label="Send">➤</button>
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
                    onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(input);} }}
                  />
                  <button className="iconBtn" onClick={()=>send(input)} aria-label="Send">➤</button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
