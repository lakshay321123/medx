'use client';
import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import ToolsTray from '../components/ToolsTray';
import Markdown from '../components/Markdown';
import PrescriptionChecker from '../components/PrescriptionChecker';
import ConceptMapper from '../components/ConceptMapper';
import { Send, Sun, Moon } from 'lucide-react';

type ChatMsg = { role: 'user'|'assistant'; content: string };
type Tool = 'none'|'prescription'|'mapper';

export default function Home(){
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [role, setRole] = useState<'patient'|'clinician'>('clinician');
  const [theme, setTheme] = useState<'dark'|'light'>('dark');
  const [tool, setTool] = useState<Tool>('none');
  const [followups, setFollowups] = useState<string[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ document.documentElement.className = theme==='light'?'light':''; },[theme]);
  useEffect(()=>{ chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }); },[messages]);

  function newChat(){ setMessages([]); setInput(''); setTool('none'); setFollowups([]); }

  async function send(text: string){
    if(!text.trim()) return;
    const history = [
      { role: 'system', content: role==='clinician'
        ? 'You are a clinical assistant. Use markdown with headings and bullet points. Avoid medical advice.'
        : 'You explain simply for patients. Use short paragraphs and markdown. Avoid medical advice.' },
      ...messages
    ];
    const userMsg: ChatMsg = { role:'user', content:text };
    setMessages(prev=>[...prev, userMsg, { role:'assistant', content:'' }]);
    setInput('');

    // STREAM
    const res = await fetch('/api/chat/stream', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ messages: [...history, userMsg] })
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

    // FOLLOW-UPS (always, topical)
    try{
      const f = await fetch('/api/followups', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ lastUserQuestion: text, lastAssistantText: acc })
      });
      const j = await f.json();
      setFollowups(Array.isArray(j.followups)? j.followups : []);
    } catch { /* ignore */ }
  }

  function onFollowup(q: string){ send(q); }

  const showHero = messages.length===0 && tool==='none';

  return (
    <div className="app">
      <Sidebar
        onNew={newChat}
        onOpenTool={(t)=>setTool(t)}
        onSearch={(q)=>{/* local search placeholder */}}
      />

      <main className="main">
        <div className="header">
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button className="item" onClick={()=>setRole(role==='patient'?'clinician':'patient')}>
              {role==='patient'?'Patient':'Clinician'}
            </button>
          </div>
          <button className="item" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>
            {theme==='dark' ? <Sun size={16}/> : <Moon size={16}/> } {theme==='dark'?'Light':'Dark'}
          </button>
        </div>

        <div className="wrap">
          {showHero && (
            <div className="hero">
              <h1>MedX</h1>
              <p>Ask anything medical. Your AI will reply in your chosen mode.</p>
              <div className="inputRow" style={{ marginTop:16 }}>
                <textarea
                  placeholder="Type your question…"
                  value={input}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(input);} }}
                />
                <button className="iconBtn" onClick={()=>send(input)} aria-label="Send"><Send size={18}/></button>
              </div>
              <ToolsTray onOpen={(t)=>{ setTool(t); }} />
            </div>
          )}

          {!showHero && (
            <>
              <div ref={chatRef} className="chat">
                {messages.map((m, i)=>(
                  <div key={i} className={`msg ${m.role}`}>
                    <div className="bubble">
                      <div className="role">{m.role==='user'?'You':'MedX'}</div>
                      <div className="content markdown"><Markdown text={m.content||''}/></div>
                      {i===messages.length-1 && followups.length>0 && m.role==='assistant' && (
                        <div className="followups">
                          {followups.map((f,idx)=>(
                            <button key={idx} className="chip" onClick={()=>onFollowup(f)}>{f}</button>
                          ))}
                        </div>
                      )}
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
                  <button className="iconBtn" onClick={()=>send(input)} aria-label="Send"><Send size={18}/></button>
                </div>
                <ToolsTray onOpen={(t)=>setTool(t)} />
              </div>
            </>
          )}

          {tool==='prescription' && <PrescriptionChecker />}
          {tool==='mapper' && <ConceptMapper />}
        </div>
      </main>
    </div>
  );
}
