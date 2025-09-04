'use client';
import { useEffect, useRef, useState, RefObject } from 'react';
import Header from '../Header';
import Markdown from '../Markdown';
import { Send } from 'lucide-react';
import { useCountry } from '@/lib/country';
import { getRandomWelcome } from '@/lib/welcomeMessages';
import { useActiveContext } from '@/lib/context';
import { isFollowUp } from '@/lib/followup';
import { useTopic } from '@/lib/topic';
import { detectFollowupIntent } from '@/lib/intents';
import { safeJson } from '@/lib/safeJson';
import type {
  ChatMessage as BaseChatMessage,
  AnalysisCategory,
} from '@/lib/context';

const STORAGE_KEY = 'medx:chat:messages';

function loadSavedMessages<T = any[]>(): T | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

type ChatMessage = BaseChatMessage & {
  tempId?: string;
  parentId?: string;
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

function isNewTopic(text: string) {
  const q = text.trim();
  return (
    /\b[a-z][a-z\s-]{1,40}\b/i.test(q) &&
    !/\b(what|how|why|best|top|latest|near|which|who|when)\b/i.test(q) &&
    q.split(/\s+/).length <= 3
  );
}

function inferTopicFromDoc(report: string) {
  const h1 = (report.match(/^#\s*(.+)$/m) || [, ""])[1];
  const hits = report.match(/\b(cancer|fracture|pneumonia|diabetes|hypertension|asthma|arthritis|kidney|liver|anemia)\b/i);
  return h1 && h1.length <= 40 ? h1 : hits?.[0] || "medical report";
}

function buildMedicinesPrompt(topic: string, country: { code3: string; name: string }) {
  const system = `You are MedX. Provide medicine options for the topic below.
TOPIC: ${topic}
User country: ${country.code3} (${country.name}). Prefer local OTC examples; if unsure, use generic names and say availability varies.
Safety: do not prescribe; advise to confirm with a clinician; contraindications only if well-established.`.trim();
  const user = "Best medicines for this condition.";
  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ];
}

function buildHospitalsPrompt(topic: string, country: { code2: string; code3: string; name: string }) {
  const system = `You are MedX. List top hospitals/centres in ${country.name} that treat: ${topic}.
Prefer nationally recognized or government/teaching institutions.
Provide city + short note. Output 5–10 items max.`.trim();
  const user = "Top hospitals for this condition.";
  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ];
}

function buildTrialsPrompt(topic: string, country: { code3: string; name: string }) {
  const system = `You are MedX. Summarize the latest clinical trial directions for: ${topic}.
If exact current trials are needed, direct users to authoritative registries (e.g., ClinicalTrials.gov, WHO ICTRP; for India: CTRI).
No fabricated IDs. Provide themes, not specific trial numbers unless confident.`.trim();
  const user = `Latest clinical trials for ${topic} (brief overview).`;
  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ];
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

export default function ChatPane({ inputRef: externalInputRef }: { inputRef?: RefObject<HTMLInputElement> } = {}) {

  const { country } = useCountry();
  const { active, setFromAnalysis, setFromChat, clear: clearContext } = useActiveContext();
  const { topic, setTopic, clearTopic } = useTopic();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [note, setNote] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'patient'|'doctor'>('patient');
  const [busy, setBusy] = useState(false);
  const [researchMode, setResearchMode] = useState(false);
  const [therapyMode, setTherapyMode] = useState(false);
  const [loadingAction, setLoadingAction] = useState<null | 'simpler' | 'doctor' | 'next'>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = externalInputRef ?? useRef<HTMLInputElement>(null);

  useEffect(()=>{ chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }); },[messages]);
  useEffect(() => {
    const init = (e?: Event) => {
      if (!e) {
        const saved = loadSavedMessages<ChatMessage[]>();
        if (saved && Array.isArray(saved) && saved.length) {
          setMessages(saved);
          setNote('');
          return;
        }
      }
      const msg = getRandomWelcome();
      setMessages([
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          kind: 'chat',
          content: msg,
        },
      ]);
      setNote('');
    };
    init();
    window.addEventListener('new-chat', init);
    return () => window.removeEventListener('new-chat', init);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (therapyMode) {
      root.classList.add('therapy-mode');
      const kicked = sessionStorage.getItem('therapyStarter');
      if (!kicked) {
        (async () => {
          try {
            const j = await safeJson(
              fetch('/api/therapy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wantStarter: true })
              })
            );
            sessionStorage.setItem('therapyStarter', '1');
            const starter = j?.starter || 'Hi, I’m here with you. What would you like to talk about?';
            // @ts-ignore
            setMessages((prev: any[]) => [
              ...prev,
              { id: `t-${Date.now()}`, role: 'assistant', kind: 'chat', content: starter }
            ]);
          } catch {
            /* ignore */
          }
        })();
      }
    } else {
      root.classList.remove('therapy-mode');
    }
  }, [therapyMode]);

  useEffect(() => {
    try {
      if (messages && messages.length) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      }
    } catch {}
  }, [messages]);

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
    setNote('');

    try {
      if (therapyMode) {
        const thread = [...messages, { role: 'user', content: text }]
          .map(m => ({
            role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'),
            content: String((m as any).content ?? (m as any).text ?? '').trim()
          }))
          .filter(m => m.content);
        let j: any;
        try {
          j = await safeJson(
            fetch('/api/therapy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: thread })
            })
          );
        } catch (e: any) {
          const msg = String(e?.message || 'HTTP error');
          setMessages(prev => prev.map(m =>
            m.id === pendingId
              ? { ...m, content: `⚠ ${msg}`, pending: false, error: msg }
              : m
          ));
          return;
        }

        if (j?.completion) {
          setMessages(prev => prev.map(m =>
            m.id === pendingId ? { ...m, content: j.completion, pending: false } : m
          ));
        } else if (j?.starter) {
          setMessages(prev => prev.map(m =>
            m.id === pendingId ? { ...m, content: j.starter, pending: false } : m
          ));
        } else {
          setMessages(prev => prev.map(m =>
            m.id === pendingId
              ? { ...m, content: '⚠ Empty response from server.', pending: false, error: 'Empty response from server.' }
              : m
          ));
        }
        return;
      }
      const intent = detectFollowupIntent(text);
      const follow = isFollowUp(text);
      const ctx = active;
      if (!topic && !intent) setTopic(text);
      else if (isNewTopic(text)) setTopic(text);

      if (follow && !ctx && !(intent && topic)) {
        setMessages(prev =>
          prev.map(m =>
            m.id === pendingId
              ? {
                  ...m,
                  pending: false,
                  content:
                    "I don't have context from earlier in this session. Please reattach or restate it if you'd like me to use it.",
                }
              : m
          )
        );
        return;
      }

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
      const systemCommon = `\nUser country: ${country.code3} (${country.name}). Prefer local examples/guidelines. If unsure, use generics and say availability varies.\n`;
      const topicHint = topic ? `ACTIVE TOPIC: ${topic.text}\nKeep answers scoped to this topic unless the user changes it.\n` : "";

      let chatMessages: { role: string; content: string }[];

      if (intent && topic) {
        chatMessages =
          intent === 'hospitals'
            ? buildHospitalsPrompt(topic.text, country)
            : intent === 'trials'
            ? buildTrialsPrompt(topic.text, country)
            : buildMedicinesPrompt(topic.text, country);
      } else if (follow && ctx) {
        const system = `\nYou are MedX. This is a FOLLOW-UP question. Use the ACTIVE CONTEXT below; do not reset topic unless user asks.\n${topicHint}ACTIVE CONTEXT TITLE: ${ctx.title}\nACTIVE CONTEXT SUMMARY:\n${ctx.summary}\n\nWhen the user asks for latest/clinical trials/guidelines, stay on the same topic/entities: ${ctx.entities?.join(', ') || 'n/a'}.\n${systemCommon}` + baseSys;
        const userMsg = `Follow-up: ${text}\nIf the question is ambiguous, ask one concise disambiguation question and then answer briefly using the context.`;
        chatMessages = [
          { role: 'system', content: system },
          { role: 'user', content: userMsg }
        ];
      } else {
        const plan = await safeJson(
          fetch('/api/medx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: text, mode, researchMode })
          })
        );

        const sys = topicHint + systemCommon + baseSys;
        const contextBlock = 'CONTEXT:\n' + JSON.stringify(plan.sections || {}, null, 2);
        chatMessages = [
          { role: 'system', content: sys },
          { role: 'user', content: `${text}\n\n${contextBlock}` }
        ];
      }

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatMessages })
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
      if (acc.length > 400) {
        setFromChat({ id: pendingId, content: acc });
      }
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

  function onFileSelected(file: File) {
    setPendingFile(file);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function analyzeFile(file: File, note: string) {
    if (!file || busy) return;
    setBusy(true);
    const pendingId = uid();
    setMessages(prev => [
      ...prev,
      { id: pendingId, role: 'assistant', kind: 'analysis', content: 'Analyzing…', pending: true }
    ]);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doctorMode', String(mode === 'doctor'));
      fd.append('country', country.code3);
      if (note.trim()) fd.append('note', note.trim());
      const search = new URLSearchParams(window.location.search);
      const threadId = search.get('threadId');
      if (threadId) fd.append('threadId', threadId);
      const sourceHash = `${file?.name ?? 'doc'}:${file?.size ?? ''}:${(file as any)?.lastModified ?? ''}`;
      fd.append('sourceHash', sourceHash);
      const data = await safeJson(
        fetch('/api/analyze', { method: 'POST', body: fd })
      );
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
      setFromAnalysis({ id: pendingId, category: data.category, content: data.report });
      setTopic(inferTopicFromDoc(data.report), "doc");
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
      setPendingFile(null);
      setNote('');
    }
  }

  async function onSubmit() {
    if (!pendingFile && !note.trim()) return;
    if (pendingFile) {
      await analyzeFile(pendingFile, note);
    } else {
      await send(note, researchMode);
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
      const data = await safeJson(
        fetch('/api/actions/refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, mode, text: last.content, country: country.code3 })
        })
      );
      const finalMsg: ChatMessage = {
        id: data.id || crypto.randomUUID(),
        role: 'assistant',
        kind: 'analysis',
        category: last.category,
        content: data.report || data.content || ''
      };
      setMessages(prev => replaceFirstPendingWith(prev, finalMsg));
      setFromAnalysis({ id: finalMsg.id, category: last.category, content: finalMsg.content });
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
    <div className="relative flex h-full flex-col">
      <Header
        mode={mode}
        onModeChange={setMode}
        researchOn={researchMode}
        onResearchChange={setResearchMode}
        onTherapyChange={setTherapyMode}
      />
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6 pb-28"
      >
        {topic && (
          <div className="mx-auto mb-2 max-w-3xl px-4 sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800">
              <span className="opacity-70">Topic:</span>
              <strong className="truncate max-w-[16rem]">{topic.text}</strong>
              <button onClick={clearTopic} className="opacity-60 hover:opacity-100">Clear</button>
            </div>
          </div>
        )}
        {active && (
          <div className="mx-auto mb-2 max-w-3xl px-4 sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800">
              <span className="opacity-70">Using context from:</span>
              <strong>{active.title}</strong>
              <button onClick={clearContext} className="opacity-60 hover:opacity-100">Clear</button>
            </div>
          </div>
        )}
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {messages.map(m =>
            m.role === 'user' ? (
              <div
                key={m.id}
                className="ml-auto max-w-[85%] rounded-2xl px-4 py-3 shadow-sm bg-slate-200 text-slate-900 dark:bg-gray-700 dark:text-gray-100"
              >
                <Markdown text={m.content} />
              </div>
            ) : (
              <AssistantMessage
                key={m.id}
                m={m}
                researchOn={researchMode}
                onQuickAction={onQuickAction}
                busy={loadingAction !== null}
              />
            )
          )}
        </div>
      </div>
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <div className="w-full max-w-3xl px-4">
          <form
            onSubmit={e => {
              e.preventDefault();
              onSubmit();
            }}
            className="w-full flex items-center gap-3 rounded-full border border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-900 px-3 py-2"
          >
            <label className="cursor-pointer px-3 py-1.5 text-sm rounded-full bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600">
              📄
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) onFileSelected(f);
                  e.currentTarget.value = '';
                }}
              />
            </label>
            {pendingFile && (
              <div className="flex items-center gap-2 rounded-full bg-white/70 dark:bg-gray-800/70 px-3 py-1 text-xs">
                <span className="truncate max-w-[8rem]">{pendingFile.name}</span>
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  aria-label="Remove file"
                >
                  ✕
                </button>
              </div>
            )}
            <input
              ref={inputRef}
              className="flex-1 bg-transparent outline-none text-sm md:text-base leading-6 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-2"
              placeholder={
                pendingFile
                  ? 'Add a note or question for this document (optional)...'
                  : 'Send a message...'
              }
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
            />
            <button
              className="px-3 py-1.5 rounded-full bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
              onClick={onSubmit}
              disabled={busy || (!pendingFile && !note.trim())}
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
