'use client';
import { useEffect, useRef, useState, RefObject, Fragment } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../Header';
import Markdown from '../Markdown';
import MessageRenderer from '../MessageRenderer';
import ResearchFilters from '@/components/ResearchFilters';
import { useResearchFilters } from '@/store/researchFilters';
import { Send } from 'lucide-react';
import { useCountry } from '@/lib/country';
import { getRandomWelcome } from '@/lib/welcomeMessages';
import { useActiveContext } from '@/lib/context';
import { isFollowUp } from '@/lib/followup';
import { detectFollowupIntent } from '@/lib/intents';
import { safeJson } from '@/lib/safeJson';
import { splitFollowUps } from '@/lib/splitFollowUps';
import { getTrials } from "@/lib/hooks/useTrials";
import { patientTrialsPrompt, clinicianTrialsPrompt } from "@/lib/prompts/trials";
import FeedbackBar from "@/components/FeedbackBar";
import type { ChatMessage as BaseChatMessage } from "@/types/chat";
import type { AnalysisCategory } from '@/lib/context';
import { ensureThread, loadMessages, saveMessages, generateTitle, updateThreadTitle } from '@/lib/chatThreads';

type ChatUiState = {
  topic: string | null;
  contextFrom: string | null; // e.g., 'Conversation summary'
};

const UI_DEFAULTS: ChatUiState = { topic: null, contextFrom: null };
const uiKey = (threadId: string) => `chat:${threadId}:ui`;

type ChatMessage =
  | (BaseChatMessage & {
      role: "user";
      kind: "chat";
      tempId?: string;
      parentId?: string;
      pending?: boolean;
      error?: string | null;
    })
  | (BaseChatMessage & {
      role: "assistant";
      kind: "chat";
      tempId?: string;
      parentId?: string;
      pending?: boolean;
      error?: string | null;
    })
  | (BaseChatMessage & {
      role: "assistant";
      kind: "analysis";
      category?: AnalysisCategory;
      tempId?: string;
      parentId?: string;
      pending?: boolean;
      error?: string | null;
    });

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

function maybeFixMedicalTypo(s: string) {
  // super conservative: only single-word queries, simple known misspellings
  const map: Record<string,string> = {
    leujimkea: "leukemia",
    leujemia: "leukemia",
    leucemia: "leukemia"
    // add more safely as needed
  };
  const oneWord = s.trim().toLowerCase();
  if (/^[a-z-]{4,}$/.test(oneWord) && map[oneWord]) {
    return { corrected: map[oneWord], ask: `Did you mean **${map[oneWord]}**? (Yes/No)` };
  }
  return null;
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
        <MessageRenderer message={{ text: m.content, payload: (m as any).payload }} />
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

function ChatCard({ m, therapyMode, onFollowUpClick, simple }: { m: Extract<ChatMessage, { kind: "chat" }>; therapyMode: boolean; onFollowUpClick: (text: string) => void; simple: boolean }) {
  if (m.pending) return <PendingChatCard label="Thinking…" />;
  return (
    <article className="mr-auto max-w-[90%] rounded-2xl p-4 md:p-6 shadow-sm space-y-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-800">
      <div className="prose prose-slate dark:prose-invert max-w-none prose-medx text-sm md:text-base">
        <MessageRenderer message={{ text: m.content, payload: m.payload }} />
      </div>
      {m.role === "assistant" && m.citations?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {m.citations.slice(0, simple ? 3 : 6).map((c, i) => (
            <a
              key={i}
              href={c.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border px-3 py-1 text-xs hover:bg-gray-100"
            >
              {c.source.toUpperCase()}
              {c.extra?.evidenceLevel ? ` · ${c.extra.evidenceLevel}` : ""}
            </a>
          ))}
        </div>
      )}
      {!therapyMode && m.followUps?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {m.followUps.map((f, i) => (
            <button
              key={i}
              onClick={() => onFollowUpClick(f)}
              className="rounded-full border px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function AssistantMessage({ m, researchOn, onQuickAction, busy, therapyMode, onFollowUpClick, simple }: { m: ChatMessage; researchOn: boolean; onQuickAction: (k: "simpler" | "doctor" | "next") => void; busy: boolean; therapyMode: boolean; onFollowUpClick: (text: string) => void; simple: boolean }) {
  return m.kind === "analysis" ? (
    <AnalysisCard m={m} researchOn={researchOn} onQuickAction={onQuickAction} busy={busy} />
  ) : (
    <ChatCard m={m} therapyMode={therapyMode} onFollowUpClick={onFollowUpClick} simple={simple} />
  );
}

export default function ChatPane({ inputRef: externalInputRef }: { inputRef?: RefObject<HTMLInputElement> } = {}) {

  const { country } = useCountry();
  const { active, setFromAnalysis, setFromChat, clear: clearContext } = useActiveContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [note, setNote] = useState('');
  const [proactive, setProactive] = useState<null | { kind: 'predispositions'|'medications'|'weight' }>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'patient'|'doctor'>('patient');
  const [busy, setBusy] = useState(false);
  const [researchMode, setResearchMode] = useState(false);
  const [therapyMode, setTherapyMode] = useState(false);
  const [loadingAction, setLoadingAction] = useState<null | 'simpler' | 'doctor' | 'next'>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = externalInputRef ?? useRef<HTMLInputElement>(null);
  const { filters } = useResearchFilters();

  const params = useSearchParams();
  const threadId = params.get('threadId');
  const context = params.get('context');
  const isProfileThread = threadId === 'med-profile' || context === 'profile';
  const conversationId = threadId || (isProfileThread ? 'med-profile' : 'unknown');
  const currentMode: 'patient'|'doctor'|'research'|'therapy' = therapyMode ? 'therapy' : (researchMode ? 'research' : mode);
  const [pendingCommitIds, setPendingCommitIds] = useState<string[]>([]);
  const [commitBusy, setCommitBusy] = useState<null | 'save' | 'discard'>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const posted = useRef(new Set<string>());
  const bootedRef = useRef<{[k:string]:boolean}>({});
  const askedKey = (thread?: string|null, kind?: string)=> `aidoc:${thread||'med-profile'}:asked:${kind||'any'}`;
  const askedRecently = (thread?: string|null, kind?: string, minutes = 60) => {
    try {
      const v = localStorage.getItem(askedKey(thread, kind));
      if (!v) return false;
      const ts = Number(v);
      return Number.isFinite(ts) && (Date.now() - ts) < minutes*60*1000;
    } catch { return false; }
  };
  const markAskedNow = (thread?: string|null, kind?: string) => {
    try { localStorage.setItem(askedKey(thread, kind), String(Date.now())); } catch {}
  };

  const [ui, setUi] = useState<ChatUiState>(UI_DEFAULTS);

  const addAssistant = (text: string, opts?: Partial<ChatMessage>) =>
    setMessages(prev => [...prev, { id: uid(), role: 'assistant', kind: 'chat', content: text, ...opts } as any]);

  function addOnce(id: string, content: string) {
    if (posted.current.has(id)) return;
    posted.current.add(id);
    addAssistant(content, { id });
  }

  // Load per-thread UI whenever threadId changes
  useEffect(() => {
    if (!threadId) { setUi(UI_DEFAULTS); return; }
    try {
      const raw = localStorage.getItem(uiKey(threadId));
      setUi(raw ? JSON.parse(raw) : UI_DEFAULTS);
    } catch {
      setUi(UI_DEFAULTS);
    }
  }, [threadId]);
  useEffect(() => { setPendingCommitIds([]); }, [threadId]);

  // Persist per-thread UI on change
  useEffect(() => {
    if (!threadId) return;
    try {
      localStorage.setItem(uiKey(threadId), JSON.stringify(ui));
    } catch {}
  }, [threadId, ui]);

  useEffect(()=>{ chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }); },[messages]);

  useEffect(() => {
    posted.current.clear();
    const tid = threadId || (isProfileThread ? 'med-profile' : null);
    if (tid) {
      ensureThread(tid);
      const saved = loadMessages(tid) as any[];
      setMessages(saved);
      posted.current = new Set(saved.filter(m => m.role === 'assistant').map((m: any) => m.id));
    } else {
      setMessages([]);
    }
  }, [threadId, isProfileThread]);

  useEffect(() => {
    if (!isProfileThread || !threadId) return;
    if (bootedRef.current[threadId]) return;     // run once per thread
    bootedRef.current[threadId] = true;
    (async () => {
      try {
        // warm greeting from Doc AI
        const boot = await fetch('/api/aidoc/message', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ text: "" })
        }).then(r=>r.json()).catch(()=>null);
        if (boot?.messages?.length) {
          setMessages(prev => [...prev, ...boot.messages.map((m:any)=>({ id: uid(), role:m.role, kind:'chat', content:m.content, pending:false }))]);
        }
        // single readiness nudge (skip if asked recently)
        if (askedRecently(threadId, 'proactive', 60)) return;
        const rd = await safeJson(fetch('/api/predictions/readiness'));
        const miss = rd?.missing || [];
        const pick = miss[0] as ('predispositions'|'medications'|'weight'|undefined);
        if (pick) {
          const q =
            pick === 'predispositions' ? 'Quick check: any family history/predispositions (e.g., diabetes, hypertension)? List comma-separated.'
            : pick === 'medications'   ? 'Quick check: do you take any regular meds? Please share name + dose (e.g., Metformin 500 mg).'
            :                            'Quick check: what is your current weight (kg)?';
          setMessages(prev => [...prev, { id: uid(), role:'assistant', kind:'chat', content: q, pending:false } as any]);
          setProactive({ kind: pick });
          markAskedNow(threadId, 'proactive');
        }
      } catch {}
    })();
  }, [isProfileThread, threadId]);

  useEffect(() => {
    if (!isProfileThread && messages.length === 0) {
      addOnce('welcome:chat', getRandomWelcome());
    }
  }, [isProfileThread, messages.length]);

  useEffect(() => {
    const tid = threadId || (isProfileThread ? 'med-profile' : null);
    if (tid) saveMessages(tid, messages as any);
  }, [messages, threadId, isProfileThread]);

  const draftKey = (threadId?: string|null)=> `chat:${threadId||'med-profile'}:draft`;
  // load draft and inject as past message (so it "reappears as past messages")
  useEffect(() => {
    const key = draftKey(threadId);
    try {
      const draft = localStorage.getItem(key);
      if (draft && draft.trim()) {
        setMessages(prev => [...prev, { id: uid(), role:'user', kind:'chat', content: draft, pending:false } as any]);
        localStorage.removeItem(key);
      }
    } catch {}
  // only once per thread change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);
  // keep draft synced
  useEffect(() => {
    const key = draftKey(threadId);
    try { localStorage.setItem(key, note || ''); } catch {}
  }, [note, threadId]);

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


  async function send(text: string, researchMode: boolean) {
    if (!text.trim() || busy) return;
    setBusy(true);

    const normalize = (s: string) =>
      s
        .replace(/\bnp\b/gi, "neutrophil percentage")
        .replace(/\bsgpt\b/gi, "ALT (SGPT)")
        .replace(/\bsgot\b/gi, "AST (SGOT)");
    const userText = isProfileThread ? normalize(text) : text;

    const userId = uid();
    const pendingId = uid();
    const nextMsgs: ChatMessage[] = [
      ...messages,
      { id: userId, role: 'user', kind: 'chat', content: userText } as ChatMessage,
      { id: pendingId, role: 'assistant', kind: 'chat', content: '', pending: true } as ChatMessage,
    ];
    setMessages(nextMsgs);
    const maybe = maybeFixMedicalTypo(userText);
    if (maybe && messages.filter(m => m.role === "assistant").slice(-1)[0]?.content !== maybe.ask) {
      // Ask once, keep pending bubble as the question (no LLM call)
      setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, content: maybe.ask, pending: false } : m));
      setBusy(false);
      return; // wait for user Yes/No
    }
    setNote('');
    if (!isProfileThread && threadId && messages.filter(m => m.role === 'user').length === 0) {
      updateThreadTitle(threadId, generateTitle(text));
    }

    try {
      if (isProfileThread) {
        const thread = [
          ...messages
            .filter(m => !m.pending)
            .map(m => ({ role: m.role, content: (m as any).content || '' })),
          { role: 'user', content: userText }
        ];

        const res = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: thread, threadId, context })
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
                setMessages(prev => prev.map(m => (m.id === pendingId ? { ...m, content: acc } : m)));
              }
            } catch {}
          }
        }
        const { main, followUps } = splitFollowUps(acc);
        setMessages(prev =>
          prev.map(m =>
            m.id === pendingId ? { ...m, content: main, followUps, pending: false } : m
          )
        );
        return;
      }
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
      const ctx = ui.contextFrom ? active : null;
      if (!ui.topic && !intent) setUi(prev => ({ ...prev, topic: text }));
      else if (isNewTopic(text)) setUi(prev => ({ ...prev, topic: text }));

      if (follow && !ctx && !(intent && ui.topic)) {
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
      const systemCommon = `\nUser country: ${country.code3} (${country.name}). Use generics and note availability varies by region.\nEnd with one short follow-up question (<=10 words) that stays on the current topic.\n`;
      const topicHint = ui.topic ? `ACTIVE TOPIC: ${ui.topic}\nKeep answers scoped to this topic unless the user changes it.\n` : "";

      let chatMessages: { role: string; content: string }[];

      if (intent && ui.topic) {
        chatMessages =
          intent === 'hospitals'
            ? buildHospitalsPrompt(ui.topic, country)
            : intent === 'trials'
            ? await (async () => {
                // 1) fetch real trials
                const { rows } = await getTrials({
                  condition: ui.topic!,
                  country: country.name, // ClinicalTrials.gov expects country name
                  status: "Recruiting,Enrolling by invitation",
                  phase: "Phase 2,Phase 3",
                  page: 1,
                  pageSize: 10,
                });

                // 2) if none found, fall back to the old high-level summary
                if (!rows.length) return buildTrialsPrompt(ui.topic!, country);

                // 3) build a structured summarization prompt using the rows
                const content =
                  mode === "patient"
                    ? patientTrialsPrompt(rows, ui.topic!)
                    : clinicianTrialsPrompt(rows, ui.topic!);

                // 4) Instruct the LLM to produce a concrete list with NCT IDs + links
                return [
                  {
                    role: "system",
                    content:
`You are MedX. Turn the provided "Data" JSON into a concise, accurate list of active clinical trials.
For each item: {Title — NCT ID — Phase — Status — Where (City, Country) — What/Primary outcome — Link}.
Do not invent IDs. If info missing, omit that field. Keep to 5–10 items. End with one short follow-up question.`
                  },
                  { role: "user", content }
                ];
              })()
            : buildMedicinesPrompt(ui.topic, country);
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
            body: JSON.stringify({ query: text, mode, researchMode, filters })
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
        body: JSON.stringify({ messages: chatMessages, threadId, context })
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
      const { main, followUps } = splitFollowUps(acc);
      setMessages(prev =>
        prev.map(m =>
          m.id === pendingId ? { ...m, content: main, followUps, pending: false } : m
        )
      );
      if (main.length > 400) {
        setFromChat({ id: pendingId, content: main });
        setUi(prev => ({ ...prev, contextFrom: 'Conversation summary' }));
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
      setUi(prev => ({
        ...prev,
        contextFrom: titleForCategory(data.category),
        topic: inferTopicFromDoc(data.report),
      }));
      if (!isProfileThread && Array.isArray(data.obsIds) && data.obsIds.length) {
        setPendingCommitIds(data.obsIds.map(String));
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
      setPendingFile(null);
      setNote('');
    }
  }

  async function onSubmit() {
    if (busy) return;

    // --- Proactive single Q&A commit path (profile thread) ---
    if (isProfileThread && proactive && !pendingFile && note.trim()) {
      const text = note.trim();
      const ack = (msg: string) => setMessages(prev => [...prev, { id: uid(), role:'assistant', kind:'chat', content: msg, pending:false } as any]);
      try {
        if (proactive.kind === 'predispositions') {
          const items = Array.from(new Set(text.split(/[,;]+/).map(s=>s.trim()).filter(Boolean)));
          await fetch('/api/profile', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ conditions_predisposition: items }) });
          ack(`Noted — added predispositions: ${items.join(', ')}`);
          await fetch('/api/profile/summary', { cache:'no-store' });
          markAskedNow(threadId, 'proactive');
        } else if (proactive.kind === 'medications') {
          const meds = text.split(/[,;]+/).map(s=>s.trim()).filter(Boolean);
          for (const m of meds) {
            await fetch('/api/observations', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kind:'medication', value_text:m, meta:{ source:'chat', committed:true }, thread_id:'med-profile', observed_at:new Date().toISOString() }) });
          }
          ack(`Noted — recorded medications: ${meds.join('; ')}`);
          markAskedNow(threadId, 'proactive');
        } else {
          const kg = parseFloat(text.replace(/[, ]/g,'').replace(/[^\d.]/g,''));
          if (Number.isFinite(kg)) {
            await fetch('/api/observations', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kind:'weight', value_text:`${kg} kg`, value_num:kg, unit:'kg', thread_id:'med-profile', observed_at:new Date().toISOString(), meta:{ source:'chat', committed:true } }) });
            ack(`Noted — weight set to ${kg} kg.`);
            markAskedNow(threadId, 'proactive');
          } else {
            ack('Could not detect a number for weight. Please reply like “72 kg”.');
            return; // keep proactive open
          }
        }
      } catch { /* swallow; user sees ack or can retry */ }
      setProactive(null);
      setMessages(prev => [...prev, { id: uid(), role:'user', kind:'chat', content: text, pending:false } as any]);
      setNote('');
      return;
    }

    // --- Medication verification (profile thread only; note-only submits) ---
    if (isProfileThread && !pendingFile && note.trim()) {
      try {
        const v = await safeJson(fetch('/api/meds/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: note }) }));
        if (v?.ok && v?.suggestion && window.confirm(`Did you mean "${v.suggestion}"?`)) {
          await safeJson(fetch('/api/observations', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              kind: 'medication',
              value_text: v.suggestion,
              unit: null,
              meta: { source: 'chat', confirmed: true, committed: true },
              thread_id: 'med-profile',
              observed_at: new Date().toISOString()
            })
          }));
          await safeJson(fetch('/api/observations', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              kind: 'note',
              value_text: `Added medication via chat: ${v.suggestion}`,
              unit: null,
              meta: { source: 'chat', committed: true },
              thread_id: 'med-profile',
              observed_at: new Date().toISOString()
            })
          }));
          const ackId = uid();
          setMessages(prev => [
            ...prev,
            { id: uid(), role:'user', kind:'chat', content: note, pending:false } as any,
            { id: ackId, role:'assistant', kind:'chat', content:`Saved **${v.suggestion}** to your profile.`, pending:false } as any
          ]);
          setNote('');
          return;
        }
      } catch {}
    }

    // Regular chat flow (file or note) ...
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
      setUi(prev => ({ ...prev, contextFrom: titleForCategory(last.category) }));
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

  function handleFollowUpClick(text: string) {
    send(text, researchMode);
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
      <ResearchFilters mode={currentMode} />
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6 pb-28"
      >
        {ui.topic && (
          <div className="mx-auto mb-2 max-w-3xl px-4 sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800">
              <span className="opacity-70">Topic:</span>
              <strong className="truncate max-w-[16rem]">{ui.topic}</strong>
              <button onClick={() => setUi(prev => ({ ...prev, topic: null }))} className="opacity-60 hover:opacity-100">Clear</button>
            </div>
          </div>
        )}
        {ui.contextFrom && (
          <div className="mx-auto mb-2 max-w-3xl px-4 sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800">
              <span className="opacity-70">Using context from:</span>
              <strong>{ui.contextFrom}</strong>
              <button onClick={() => { clearContext(); setUi(prev => ({ ...prev, contextFrom: null })); }} className="opacity-60 hover:opacity-100">Clear</button>
            </div>
          </div>
        )}
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {messages.filter((m: any) => m.role !== 'system').map(m =>
            m.role === 'user' ? (
              <div
                key={m.id}
                className="ml-auto max-w-[85%] rounded-2xl px-4 py-3 shadow-sm bg-slate-200 text-slate-900 dark:bg-gray-700 dark:text-gray-100"
              >
                <Markdown text={m.content} />
              </div>
            ) : (
              <Fragment key={m.id}>
                <AssistantMessage
                  m={m}
                  researchOn={researchMode}
                  onQuickAction={onQuickAction}
                  busy={loadingAction !== null}
                  therapyMode={therapyMode}
                  onFollowUpClick={handleFollowUpClick}
                  simple={currentMode === 'patient'}
                />
                <FeedbackBar
                  conversationId={conversationId}
                  messageId={m.id}
                  mode={currentMode}
                  model={undefined}
                  hiddenInTherapy={true}
                />
              </Fragment>
            )
        )}
      </div>
      {pendingCommitIds.length > 0 && (
        <div className="mx-auto my-4 max-w-3xl px-4 sm:px-6">
          <div className="rounded-lg border p-3 text-sm flex items-center gap-2 bg-white dark:bg-gray-800">
            <span>Add this to your Medical Profile?</span>
            {commitError && <span className="text-xs text-rose-600">{commitError}</span>}
            <button
              onClick={async () => {
                setCommitBusy('save');
                setCommitError(null);
                try {
                  for (const id of pendingCommitIds) {
                    const res = await fetch('/api/observations/commit', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id }),
                    });
                    if (!res.ok) throw new Error('commit');
                  }
                  setPendingCommitIds([]);
                  window.dispatchEvent(new Event('observations-updated'));
                } catch {
                  setCommitError('Could not save. Are you signed in?');
                } finally {
                  setCommitBusy(null);
                }
              }}
              disabled={commitBusy !== null}
              className="text-xs px-2 py-1 rounded-md border disabled:opacity-50 disabled:cursor-not-allowed"
            >{commitBusy === 'save' ? 'Saving…' : 'Save'}</button>
            <button
              onClick={async () => {
                setCommitBusy('discard');
                setCommitError(null);
                try {
                  for (const id of pendingCommitIds) {
                    const res = await fetch('/api/observations/discard', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id }),
                    });
                    if (!res.ok) throw new Error('discard');
                  }
                  setPendingCommitIds([]);
                  window.dispatchEvent(new Event('observations-updated'));
                } catch {
                  setCommitError('Could not discard. Are you signed in?');
                } finally {
                  setCommitBusy(null);
                }
              }}
              disabled={commitBusy !== null}
              className="text-xs px-2 py-1 rounded-md border disabled:opacity-50 disabled:cursor-not-allowed"
            >{commitBusy === 'discard' ? 'Discarding…' : 'Discard'}</button>
          </div>
        </div>
      )}
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
