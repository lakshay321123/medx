'use client';
import { useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import Markdown from '../components/Markdown';
import { Send } from 'lucide-react';
import { useCountry } from '@/lib/country';

type AnalysisCategory =
  | "xray"
  | "lab_report"
  | "prescription"
  | "discharge_summary"
  | "other_medical_doc";

type ChatMessage =
  | {
      id: string;
      tempId?: string;
      role: "assistant" | "user";
      kind: "analysis";
      parentId?: string;
      category?: AnalysisCategory;
      content: string;
      pending?: boolean;
      error?: string | null;
    }
  | {
      id: string;
      tempId?: string;
      role: "assistant" | "user";
      kind: "chat";
      content: string;
      pending?: boolean;
      error?: string | null;
    };

const uid = () => Math.random().toString(36).slice(2);

function getLastAnalysis(list: ChatMessage[]) {
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i];
    if (m.role === "assistant" && m.kind === "analysis" && !m.pending && !m.error) return m;
  }
}

function replaceFirstPendingWith(list: ChatMessage[], finalMsg: ChatMessage) {
  const copy = [...list];
  const idx = copy.findIndex(m => m.pending);
  if (idx >= 0) copy[idx] = finalMsg;
  return copy;
}

function titleForCategory(c?: AnalysisCategory) {
  switch (c) {
    case "xray":
      return "Imaging Report";
    case "lab_report":
      return "Lab Report Summary";
    case "prescription":
      return "Prescription Summary";
    case "discharge_summary":
      return "Discharge Summary";
    default:
      return "Medical Document Summary";
  }
}

function PendingAnalysisCard({ label }: { label: string }) {
  return (
    <article className="mr-auto max-w-[90%] rounded-2xl p-4 md:p-6 shadow-sm bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-800">
      <div className="text-sm text-slate-600 dark:text-slate-300">{label}</div>
    </article>
  );
}

function PendingChatCard({ label }: { label: string }) {
  return (
    <article className="mr-auto max-w-[90%] rounded-2xl p-4 md:p-6 shadow-sm bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-800">
      <div className="text-sm text-slate-600 dark:text-slate-300">{label}</div>
    </article>
  );
}

function AnalysisCard({ m, researchOn, onQuickAction, busy }: { m: Extract<ChatMessage, { kind: "analysis" }>; researchOn: boolean; onQuickAction: (k: "simpler" | "doctor" | "next") => void; busy: boolean }) {
  const header = titleForCategory(m.category);
  if (m.pending) return <PendingAnalysisCard label="Analyzing file…" />;
  return (
    <article className="mr-auto max-w-[90%] rounded-2xl p-4 md:p-6 shadow-sm space-y-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-800">
      <header className="flex items-center gap-2">
        <h2 className="text-lg md:text-xl font-semibold">{header}</h2>
        {researchOn && (
          <span className="ml-auto text-xs rounded-full px-2 py-0.5 bg-indigo-100 text-indigo-900 border border-indigo-200/60 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800">
            Research Mode
          </span>
        )}
      </header>
      <div className="prose prose-slate dark:prose-invert max-w-none prose-medx text-sm md:text-base">
        <Markdown text={m.content} />
      </div>
      {m.error && (
        <div className="inline-flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-200 dark:border-rose-800">
          ⚠️ {m.error}
        </div>
      )}
      {!m.error && (
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={busy}
            onClick={() => onQuickAction("simpler")}
          >
            Explain simpler
          </button>
          <button
            type="button"
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={busy}
            onClick={() => onQuickAction("doctor")}
          >
            Doctor’s view
          </button>
          <button
            type="button"
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={busy}
            onClick={() => onQuickAction("next")}
          >
            What next?
          </button>
        </div>
      )}
      <p className="text-xs text-amber-500/90 pt-2">
        AI assistance only — not a medical diagnosis. Confirm with a clinician.
      </p>
    </article>
  );
}

function ChatCard({ m }: { m: Extract<ChatMessage, { kind: "chat" }> }) {
  if (m.pending) return <PendingChatCard label="Thinking…" />;
  return (
    <article className="mr-auto max-w-[90%] rounded-2xl p-4 md:p-6 shadow-sm space-y-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-800">
      <div className="prose prose-slate dark:prose-invert max-w-none prose-medx text-sm md:text-base">
        <Markdown text={m.content} />
      </div>
    </article>
  );
}

function AssistantMessage({ m, researchOn, onQuickAction, busy }: { m: ChatMessage; researchOn: boolean; onQuickAction: (k: "simpler" | "doctor" | "next") => void; busy: boolean }) {
  return m.kind === "analysis" ? (
    <AnalysisCard m={m} researchOn={researchOn} onQuickAction={onQuickAction} busy={busy} />
  ) : (
    <ChatCard m={m} />
  );
}

export default function Home() {
  const { country } = useCountry();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'patient'|'doctor'>('patient');
  const [busy, setBusy] = useState(false);
  const [researchMode, setResearchMode] = useState(false);
  const [loadingAction, setLoadingAction] = useState<null | 'simpler' | 'doctor' | 'next'>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }); },[messages]);
  useEffect(()=>{ const h=()=>{ setMessages([]); setInput(''); }; window.addEventListener('new-chat', h); return ()=>window.removeEventListener('new-chat', h); },[]);

  async function send(text: string, researchMode: boolean) {
    if (!text.trim() || busy) return;
    setBusy(true);

    const userId = uid();
    const pendingId = uid();
    setMessages(prev => [
      ...prev,
      { id: userId, role: 'user', kind: 'chat', content: text },
      { id: pendingId, role: 'assistant', kind: 'chat', content: '', pending: true }
    ]);
    setInput('');

    try {
      const planRes = await fetch('/api/medx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, mode, researchMode })
      });
      if (!planRes.ok) throw new Error(`MedX API error ${planRes.status}`);
      const plan = await planRes.json();

      const linkNudge =
        'When adding a reference, always format as [title](https://full.url) with the full absolute URL. Never output Learn more without a URL, and never use relative links.';
      const baseSys =
        mode === 'doctor'
          ? `You are a clinical assistant. Write clean markdown with headings and bullet lists.
If CONTEXT has codes, interactions, or trials, summarize and add clickable links. Avoid medical advice.
${linkNudge}`
          : `You are a patient-friendly explainer. Use simple markdown and short paragraphs.
If CONTEXT has codes or trials, explain them in plain words and add links. Avoid medical advice.
${linkNudge}`;
      const sys = `\nYou are MedX. User country: ${country.code3}.
Prefer local guidelines, availability, dosing units, and OTC product examples used in ${country.name}.
If country-specific examples are uncertain, give generic names and note availability varies by region.
` + baseSys;

      const contextBlock = 'CONTEXT:\n' + JSON.stringify(plan.sections || {}, null, 2);

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: `${text}\n\n${contextBlock}` }
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

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          if (line.trim() === 'data: [DONE]') continue;
          try {
            const payload = JSON.parse(line.replace(/^data:\s*/, ''));
            const delta = payload?.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages(prev =>
                prev.map(m => (m.id === pendingId ? { ...m, content: acc } : m))
              );
            }
          } catch {}
        }
      }
      setMessages(prev => prev.map(m => (m.id === pendingId ? { ...m, pending: false } : m)));
    } catch (e: any) {
      console.error(e);
      setMessages(prev =>
        prev.map(m =>
          m.id === pendingId
            ? {
                ...m,
                content: `⚠️ ${String(e?.message || e)}`,
                pending: false,
                error: String(e?.message || e)
              }
            : m
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File) {
    if (!file || busy) return;
    setBusy(true);
    const pendingId = uid();
    setMessages(prev => [
      ...prev,
      { id: pendingId, role: 'assistant', kind: 'analysis', content: `Analyzing "${file.name}"…`, pending: true }
    ]);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doctorMode', String(mode === 'doctor'));
      fd.append('country', country.code3);
      const res = await fetch('/api/analyze', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Analysis failed');
      setMessages(prev =>
        prev.map(m =>
          m.id === pendingId
            ? {
                id: pendingId,
                role: 'assistant',
                kind: 'analysis',
                category: data.category,
                content: data.report,
                pending: false
              }
            : m
        )
      );
    } catch (e: any) {
      console.error(e);
      setMessages(prev =>
        prev.map(m =>
          m.id === pendingId
            ? {
                ...m,
                content: `⚠️ ${String(e?.message || e)}`,
                pending: false,
                error: String(e?.message || e)
              }
            : m
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function onQuickAction(action: 'simpler' | 'doctor' | 'next') {
    if (loadingAction) return;
    const last = getLastAnalysis(messages);
    if (!last) return;

    setLoadingAction(action);

    const tempId = `pending_${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: tempId,
        tempId,
        role: 'assistant',
        kind: 'analysis',
        category: last.category,
        content: 'Analyzing…',
        pending: true
      }
    ]);

    try {
      const res = await fetch('/api/actions/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, mode, text: last.content, country: country.code3 })
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      const data = JSON.parse(text);

      setMessages(prev =>
        replaceFirstPendingWith(prev, {
          id: data.id || crypto.randomUUID(),
          role: 'assistant',
          kind: 'analysis',
          category: last.category,
          content: data.report || data.content || ''
        })
      );
    } catch (e: any) {
      setMessages(prev =>
        replaceFirstPendingWith(prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          kind: 'analysis',
          category: last.category,
          content: 'Sorry — that request failed. Please try again.',
          error: e?.message || 'Request failed'
        })
      );
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <>
      <Header mode={mode} onModeChange={setMode} researchOn={researchMode} onResearchChange={setResearchMode} />
      <div ref={chatRef} className="flex-1 px-4 sm:px-6 lg:px-8 pt-4 md:pt-6 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {messages.map(m =>
            m.role === 'user' ? (
              <div key={m.id} className="ml-auto max-w-[85%] rounded-2xl px-4 py-3 shadow-sm bg-slate-200 text-slate-900 dark:bg-gray-700 dark:text-gray-100">
                <Markdown text={m.content} />
              </div>
            ) : (
              <AssistantMessage key={m.id} m={m} researchOn={researchMode} onQuickAction={onQuickAction} busy={loadingAction !== null} />
            )
          )}
          <div aria-hidden className="h-32 md:h-36" />
        </div>
      </div>
      <div className="sticky bottom-0 inset-x-0 md:ml-64 bg-gradient-to-t from-slate-50/70 to-transparent dark:from-black/40 px-4 sm:px-6 pt-3 pb-4 z-30">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-900 px-3 py-2">
            <label className="cursor-pointer px-3 py-1.5 text-sm rounded-full bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600">
              📄
              <input type="file" accept="application/pdf,image/*" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) handleFile(f); e.currentTarget.value=''; }} />
            </label>
            <input className="flex-1 bg-transparent outline-none text-sm md:text-base leading-6 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-2" placeholder="Send a message..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(input, researchMode);} }} />
            <button className="px-3 py-1.5 rounded-full bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600" onClick={()=>send(input, researchMode)} disabled={busy} aria-label="Send">
              <Send size={16}/>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
