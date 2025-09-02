'use client';
import { useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import Markdown from '../components/Markdown';
import { Send } from 'lucide-react';

 type ChatMsg = { role: 'user'|'assistant'; content: string };

export default function Home(){
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'patient'|'doctor'>('patient');
  const [busy, setBusy] = useState(false);
  const [researchMode, setResearchMode] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }); },[messages]);
  useEffect(()=>{ const h=()=>{ setMessages([]); setInput(''); }; window.addEventListener('new-chat', h); return ()=>window.removeEventListener('new-chat', h); },[]);

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
              setMessages(prev=>{ const copy = [...prev]; copy[copy.length-1] = { role:'assistant', content: acc }; return copy; });
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
    <>
      <Header mode={mode} onModeChange={setMode} researchOn={researchMode} onResearchChange={setResearchMode} />
      <div ref={chatRef} className="flex-1 px-4 sm:px-6 lg:px-8 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl py-4 md:py-6 space-y-4">
          {messages.map((m,i)=>(
            m.role==='user' ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-2xl px-4 py-3 shadow-sm bg-slate-200 text-slate-900 dark:bg-gray-700 dark:text-gray-100">
                <Markdown text={m.content}/>
              </div>
            ) : (
              <article key={i} className="mr-auto max-w-[90%] rounded-2xl p-4 md:p-6 shadow-sm space-y-3 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-800">
                <header className="flex items-center gap-2">
                  <h2 className="text-lg md:text-xl font-semibold">Imaging Report</h2>
                  {researchMode && (
                    <span className="ml-auto text-xs rounded-full px-2 py-0.5 bg-indigo-100 text-indigo-900 border border-indigo-200/60 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800">
                      Research Mode
                    </span>
                  )}
                </header>
                <div className="prose prose-sm dark:prose-invert">
                  <Markdown text={m.content}/>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button className="btn-secondary" onClick={()=>send('Explain simpler', researchMode)}>Explain simpler</button>
                  <button className="btn-secondary" onClick={()=>send("Doctor’s view", researchMode)}>Doctor’s view</button>
                  <button className="btn-secondary" onClick={()=>send('What next?', researchMode)}>What next?</button>
                </div>
                <p className="text-xs text-amber-500/90 pt-2">
                  AI assistance only — not a medical diagnosis. Confirm with a clinician.
                </p>
              </article>
            )
          ))}
        </div>
      </div>
      <div className="sticky bottom-0 inset-x-0 md:ml-64 bg-gradient-to-t from-slate-50/70 to-transparent dark:from-black/40 pt-3 pb-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-900 px-2 py-1.5">
            <label className="cursor-pointer px-3 py-1.5 text-sm rounded-full bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600">
              📄
              <input type="file" accept="application/pdf,image/*" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) handleFile(f); e.currentTarget.value=''; }} />
            </label>
            <input className="flex-1 bg-transparent outline-none text-sm md:text-base placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Send a message..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(input, researchMode);} }} />
            <button className="px-3 py-1.5 rounded-full bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600" onClick={()=>send(input, researchMode)} disabled={busy} aria-label="Send">
              <Send size={16}/>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
