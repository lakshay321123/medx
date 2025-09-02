'use client';
import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Markdown from '../components/Markdown';
import { Send, Sun, Moon, User, Stethoscope, ClipboardList, FlaskConical } from 'lucide-react';
import { parseLabValues } from '../lib/parseLabs';

type ChatMsg = { role: 'user'|'assistant'; content: string };

export default function Home(){
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'patient'|'doctor'|'admin'>('patient');
  const [theme, setTheme] = useState<'dark'|'light'>('dark');
  const [busy, setBusy] = useState(false);
  const [researchMode, setResearchMode] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ document.documentElement.className = theme==='light'?'light':''; },[theme]);
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

  async function handleUpload(file: File) {
    if (!file) return;
    setBusy(true);

    try {
      const idx = messages.length;
      setMessages(prev=>[...prev, { role:'assistant', content:`Processing "${file.name}"…` }]);

      let extractedText = '';
      const isPdf =
        file.type.toLowerCase().includes('pdf') ||
        file.name.toLowerCase().endsWith('.pdf');
      const fd = new FormData();
      fd.append('file', file);
      if (isPdf) {
        const r = await fetch('/api/rxnorm/normalize-pdf', {
          method: 'POST',
          body: fd,
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || 'PDF parse error');
        extractedText = String(j.text || '').trim();
      } else {
        const o = await fetch('/api/ocr', { method: 'POST', body: fd });
        const oj = await o.json();
        if (!o.ok) throw new Error(oj?.error || 'OCR failed');
        extractedText = String(oj.text || '').trim();
      }

      // Classify document type
      const classRes = await fetch('/api/chat', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          messages:[
            { role:'system', content:'You are a medical document classifier. Respond with one word: prescription, lab_report, or other.' },
            { role:'user', content: extractedText.slice(0,4000) }
          ]
        })
      });
      const docTypeRaw = (await classRes.text()).trim().toLowerCase();
      const docType = /lab/.test(docTypeRaw) ? 'lab_report' : /prescription/.test(docTypeRaw) ? 'prescription' : 'other';

      // Summarize document for current mode
      const summaryPrompt = mode==='doctor'
        ? `You are a clinical summarizer. Provide a concise summary of this ${docType.replace('_',' ')} for physicians.`
        : mode==='admin'
          ? `You summarize medical documents for administrative staff. Provide a brief summary of this ${docType.replace('_',' ')} focusing on logistics and coding.`
          : `You summarize medical documents for patients in simple language. Provide a short summary of this ${docType.replace('_',' ')}.`;
      const sumRes = await fetch('/api/chat', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          messages:[
            { role:'system', content: summaryPrompt },
            { role:'user', content: extractedText.slice(0,4000) }
          ]
        })
      });
      const summary = (await sumRes.text()).trim();

      // Normalize medications via RxNorm
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

      // Parse lab values
      const labs = parseLabValues(extractedText);

      const docLabel = docType==='lab_report'? 'Lab report' : docType==='prescription'? 'Prescription' : 'Document';
      const lines: string[] = [];
      lines.push(`**${docLabel} analysis – ${file.name}**`);
      if (summary) {
        lines.push(`**Summary:**\n${summary}`);
      }
      if (labs.length) {
        lines.push('**Lab results:**');
        labs.forEach(l => {
          const range = `${l.normalLow}-${l.normalHigh} ${l.unit}`;
          const flag = l.flag==='normal' ? '' : ` **${l.flag.toUpperCase()}**`;
          lines.push(`- ${l.name}: ${l.value} ${l.unit}${flag} (normal ${range})`);
        });
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
      if (extractedText) {
        lines.push(`<details><summary>Extracted text</summary>\n\n${extractedText.slice(0,2000)}\n\n</details>`);
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

  async function handleImaging(file: File) {
    if (!file) return;
    setBusy(true);
    try {
      const idx = messages.length;
      setMessages(prev=>[...prev, { role:'assistant', content:`Analyzing ${file.name}…` }]);
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/imaging/analyze', { method:'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Imaging analysis failed');
      const lines: string[] = [];
      lines.push('**Imaging Report**');
      if (data.report) lines.push(data.report);
      if (data.disclaimer) lines.push(`_${data.disclaimer}_`);
      setMessages(prev=>{ const copy=[...prev]; copy[idx] = { role:'assistant', content: lines.join('\n\n') }; return copy; });
    } catch(e:any) {
      setMessages(prev=>[...prev, { role:'assistant', content:`⚠️ Imaging failed: ${String(e?.message || e)}` }]);
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
          <button className="item" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>
            {theme==='dark'? <><Sun size={16}/> Light</> : <><Moon size={16}/> Dark</>}
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
                  🩻 Upload X-ray
                  <input
                    type="file" accept="image/*" style={{ display:'none' }}
                    onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleImaging(f); e.currentTarget.value=''; }}
                  />
                </label>
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
                  🩻 Upload X-ray
                    <input
                      type="file" accept="image/*" style={{ display:'none' }}
                      onChange={(e)=>{ const f=e.target.files?.[0]; if(f) handleImaging(f); e.currentTarget.value=''; }}
                    />
                  </label>
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
