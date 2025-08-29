'use client';
import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Markdown from '../components/Markdown';
import { Send, Sun, Moon, User, Stethoscope } from 'lucide-react';

type ChatMsg = { role: 'user'|'assistant'; content: string };

export default function Home(){
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'patient'|'doctor'>('patient'); // unified toggle
  const [theme, setTheme] = useState<'dark'|'light'>('dark');
  const chatRef = useRef<HTMLDivElement>(null);
  const [showHero, setShowHero] = useState(true);

  useEffect(()=>{ document.documentElement.className = theme==='light'?'light':''; },[theme]);
  useEffect(()=>{ document.documentElement.setAttribute('data-role', mode==='doctor'?'doctor':''); },[mode]);
  useEffect(()=>{ chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }); },[messages]);

  async function send(text: string){
    if(!text.trim()) return;

    // 1) Ask our orchestrator for structured data
    const planRes = await fetch('/api/medx', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ query: text, mode })
    });
    const plan = await planRes.json();

    // 2) Build a system prompt based on mode and attach structured sections
    const sys = mode==='doctor'
      ? `You are a clinical assistant. Output well-structured markdown with clinical precision.
If codes/trials/interactions are provided in "CONTEXT", summarize and cite as links.
Avoid giving medical advice or diagnosis.`
      : `You are a patient-friendly educator. Use short paragraphs and simple markdown.
If "CONTEXT" has codes or trials, explain what they mean in plain language.
Avoid medical advice; suggest talking to a clinician.`;

    const contextBlock = "CONTEXT:\n" + JSON.stringify(plan.sections || {}, null, 2);

    // 3) Add the user message to chat UI and a streaming assistant placeholder
    const userMsg: ChatMsg = { role:'user', content:text };
    setMessages(prev=>[...prev, userMsg, { role:'assistant', content:'' }]);
    setInput('');
    setShowHero(false);

    // 4) Stream from LLM with the context baked in
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
    while(true){
      const { done, value } = await reader.read();
      if(done) break;
      const chunk = decoder.decode(value);
      acc += chunk;
      setMessages(prev=>{
        const copy = [...prev];
        copy[copy.length-1] = { role:'assistant', content: acc };
        return copy;
      });
    }
  }

  return (
    <div className="app" style={{display:'flex',height:'100vh'}}>
      <Sidebar onNew={()=>{setMessages([]);setShowHero(true);}} onSearch={()=>{}} />
      <main className="chat" style={{flex:1,display:'flex',flexDirection:'column'}}>
        <div className="header">
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button className="item" onClick={()=>setMode(mode==='patient'?'doctor':'patient')}>
              {mode==='patient'? <><User size={16}/> Patient</> : <><Stethoscope size={16}/> Doctor</>}
            </button>
          </div>
          <button className="item" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>
            {theme==='dark' ? <Sun size={16}/> : <Moon size={16}/> } {theme==='dark'?'Light':'Dark'}
          </button>
        </div>
        {showHero && (
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
              <button className="iconBtn" onClick={()=>send(input)} aria-label="Send"><Send size={18}/></button>
            </div>
          </div>
        )}
        {!showHero && (
          <>
            <div className="chatWindow" ref={chatRef} style={{flex:1,overflowY:'auto',padding:16}}>
              {messages.map((m,i)=>(
                <div key={i} className={`msg ${m.role}`} style={{marginBottom:12}}>
                  <Markdown>{m.content}</Markdown>
                </div>
              ))}
            </div>
            <div className="inputRow" style={{display:'flex',gap:8,padding:16}}>
              <textarea
                placeholder="Type your question…"
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(input);} }}
                style={{flex:1}}
              />
              <button className="iconBtn" onClick={()=>send(input)} aria-label="Send"><Send size={18}/></button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
