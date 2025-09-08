'use client';
import { useEffect, useRef, useState, RefObject, Fragment } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../Header';
import ChatMarkdown from '@/components/ChatMarkdown';
import ResearchFilters from '@/components/ResearchFilters';
import TrialsTable from "@/components/TrialsTable";
import type { TrialRow } from "@/types/trials";
import { useResearchFilters } from '@/store/researchFilters';
import { Send, Paperclip, Clipboard, Stethoscope, Users, ChevronDown, ChevronUp } from 'lucide-react';
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
import { ensureThread, loadMessages, saveMessages, generateTitle, updateThreadTitle, upsertThreadIndex } from '@/lib/chatThreads';
import { useMemoryStore } from "@/lib/memory/useMemoryStore";
import { summarizeTrials } from "@/lib/research/summarizeTrials";
import { computeTrialStats, type TrialStats } from "@/lib/research/trialStats";
import { detectSocialIntent, replyForSocialIntent } from "@/lib/social";
import { pushFullMem, buildFullContext } from "@/lib/memory/shortTerm";
import { detectEditIntent } from "@/lib/intents/editIntents";
import { getLastStructured, maybeIndexStructured, setLastStructured } from "@/lib/memory/structured";
import { replaceEverywhere, addLineToSection, removeEverywhere, addBurrataIfMissing } from "@/lib/editors/recipeEdit";
import { detectAdvancedDomain } from "@/lib/intents/advanced";
// === ADD-ONLY for domain routing ===
import { detectDomain } from "@/lib/intents/domains";
import * as DomainStyles from "@/lib/prompts/domains";

async function computeEval(expr: string) {
  const r = await fetch("/api/compute/math", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ op:"eval", expr }) });
  const j = await r.json(); if (!j.ok) throw new Error(j.error||"compute failed"); return j.out as string;
}

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
  if (detectSocialIntent(text)) return false;
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
      <ChatMarkdown content={m.content} />
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
      <ChatMarkdown content={m.content} />
      {m.role === "assistant" && (m.citations?.length || 0) > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {(m.citations || []).slice(0, simple ? 3 : 6).map((c, i) => (
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
      {!therapyMode && (m.followUps?.length || 0) > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {(m.followUps || []).map((f, i) => (
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
  const inputRef =
    (externalInputRef as unknown as RefObject<HTMLTextAreaElement>) ??
    (useRef<HTMLTextAreaElement>(null) as RefObject<HTMLTextAreaElement>);
  const { filters } = useResearchFilters();

  // Auto-resize the textarea up to a max height
  useEffect(() => {
    const el = (inputRef?.current as unknown as HTMLTextAreaElement | null);
    if (!el) return;
    el.style.height = 'auto';
    const max = 200; // px; ~ChatGPT feel
    el.style.height = Math.min(el.scrollHeight, max) + 'px';
  }, [note, inputRef]);

  const [trialRows, setTrialRows] = useState<TrialRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [stats, setStats] = useState<TrialStats | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { enabled, rememberThisThread, autoSave, pushSuggestion, setLastSaved } = useMemoryStore();

  function handleTrials(rows: TrialRow[]) {
    setTrialRows(rows);
    setSearched(true);

    // summarize trials for quick overview
    const s = summarizeTrials(rows as any, mode === "doctor" ? "doctor" : "patient");
    setSummary(s);
    setStats(computeTrialStats(rows as any));
    setShowDetails(false); // collapse on new search
  }

  const params = useSearchParams();
  const threadId = params.get('threadId');
  const context = params.get('context');
  // ADD: stable fallback thread key for default chat
  const stableThreadId = threadId || 'default-thread';
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

  useEffect(() => {
    const onProfileUpdated = () => {
      // if profile thread is open, nudge a silent refresh of readiness/prompts
      // (kept light: we don’t spam messages, just clear cached “askedRecently”.)
      sessionStorage.removeItem('asked:proactive');
    };
    window.addEventListener('profile-updated', onProfileUpdated);
    return () => window.removeEventListener('profile-updated', onProfileUpdated);
  }, []);

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
    if (!threadId) return;
    // Ensure first auto-opened chat also shows in sidebar
    upsertThreadIndex(threadId, "Untitled");
  }, [threadId]);

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
            try {
              const sess = await safeJson(fetch('/api/auth/session'));
              const userId = sess?.user?.id;
              if (userId) {
                const r = await fetch(`/api/therapy/notes?userId=${userId}`);
                const { note } = await r.json();
                if (note?.summary) {
                  const line = `Last time we explored: ${note.summary} — would you like to continue from there or talk about something new?`;
                  setMessages((prev: any[]) => [
                    ...prev,
                    { id: uid(), role: 'assistant', kind: 'chat', content: line, pending: false }
                  ]);
                }
              }
            } catch {}
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
    if (threadId) pushFullMem(threadId, "user", userText);
    if (stableThreadId) {
      try { pushFullMem(stableThreadId, "user", userText); } catch {}
    }

    // --- social intent fast path: greet/thanks/yes/no/maybe/repeat/simpler/shorter/longer/next ---
    const social = detectSocialIntent(userText);
    if (social) {
      const msgBase = replyForSocialIntent(social, mode);

      // Optionally use last assistant message for repeat/shorter (lightweight, no LLM)
      const lastAssistant = [...messages].reverse().find(m =>
        m.role === "assistant" && m.kind === "chat" && !m.pending && !m.error
      ) as any | undefined;

      let content = msgBase;
      if (lastAssistant && (social === "repeat" || social === "shorter")) {
        const t = String(lastAssistant.content || "");
        if (social === "repeat") content += "\n\n" + t;
        if (social === "shorter") content += "\n\n" + (t.length > 400 ? t.slice(0, 400) + " …" : t);
      }

      setMessages(prev => [
        ...prev,
        { id: uid(), role: "user", kind: "chat", content: userText } as any,
        { id: uid(), role: "assistant", kind: "chat", content } as any,
      ]);
      if (threadId && content && content.trim()) {
        pushFullMem(threadId, "assistant", content);
        maybeIndexStructured(threadId, content);
      }
      if (stableThreadId) {
        try { pushFullMem(stableThreadId, "assistant", content); } catch {}
      }
      setNote("");
      setBusy(false);
      return; // IMPORTANT: do not set topic, do not trigger research/planner
    }

    // --- EDIT FAST-PATH (non-invasive, uses last structured content) ---
    try {
      const edit = detectEditIntent(userText);
      if (edit) {
        const last = threadId ? getLastStructured(threadId) : null;
        if (!last || !last.content) {
          setMessages(prev => [
            ...prev,
            { id: uid(), role: "user", kind: "chat", content: userText } as any,
            {
              id: uid(),
              role: "assistant",
              kind: "chat",
              content: "I don’t see a saved recipe/plan in this thread yet. Want me to create one now?",
            } as any,
          ]);
          setNote(""); setBusy(false);
          return;
        }

        let updated = last.content;

        if (edit.type === "recall" || edit.type === "finalize") {
          // just show last structured as-is
        } else if (edit.type === "replace") {
          updated = replaceEverywhere(updated, edit.from, edit.to);
        } else if (edit.type === "add") {
          // default: add to Ingredients
          updated = addLineToSection(updated, "Ingredients", edit.what);
        } else if (edit.type === "remove") {
          updated = removeEverywhere(updated, edit.what);
        } else if (edit.type === "transform") {
          // light built-in: pasta transform gets burrata step if relevant
          if (edit.to === "pasta") {
            updated = addLineToSection(updated, "Ingredients", "300g short pasta (penne or rigatoni)");
            updated = addLineToSection(updated, "Instructions", "Cook pasta al dente, reserve 1/2 cup pasta water, and toss with the sauce.");
            updated = addBurrataIfMissing(updated);
          } else {
            // generic note—can later call LLM with original content as context if you want
            updated = addLineToSection(updated, "Instructions", `Variation: turn into ${edit.to}${edit.extra ? " — " + edit.extra : ""}.`);
          }
        }

        // Save new structured version
        if (threadId) setLastStructured(threadId, { ...last, content: updated, ts: Date.now() });

        // Post response (user echo + updated content)
        setMessages(prev => [
          ...prev,
          { id: uid(), role: "user", kind: "chat", content: userText } as any,
          { id: uid(), role: "assistant", kind: "chat", content: updated } as any,
        ]);
        setNote(""); setBusy(false);
        return; // IMPORTANT: don’t run planner for edit-intents
      }
    } catch {
      // never block the normal flow
    }

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
      if (threadId && maybe.ask.trim()) {
        pushFullMem(threadId, "assistant", maybe.ask);
        maybeIndexStructured(threadId, maybe.ask);
      }
      if (stableThreadId) {
        try { pushFullMem(stableThreadId, "assistant", maybe.ask); } catch {}
      }
      setBusy(false);
      return; // wait for user Yes/No
    }
    setNote('');
    if (
      !isProfileThread &&
      threadId &&
      text.trim() &&
      messages.filter(m => m.role === 'user').length === 0
    ) {
      const nt = generateTitle(text);
      updateThreadTitle(threadId, nt);
      upsertThreadIndex(threadId, nt);
    }

    try {
      const fullContext = buildFullContext(stableThreadId);
      const contextBlock = fullContext ? `\n\nCONTEXT (recent conversation):\n${fullContext}` : "";
      if (isProfileThread) {
        const thread = [
          ...messages
            .filter(m => !m.pending)
            .map(m => ({ role: m.role, content: (m as any).content || '' })),
          { role: 'user', content: `${userText}${contextBlock}` }
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
        if (threadId && main && main.trim()) {
          pushFullMem(threadId, "assistant", main);
          maybeIndexStructured(threadId, main);
        }
        if (stableThreadId) {
          try { pushFullMem(stableThreadId, "assistant", main); } catch {}
        }
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
          const content = `⚠ ${msg}`;
          setMessages(prev => prev.map(m =>
            m.id === pendingId
              ? { ...m, content, pending: false, error: msg }
              : m
          ));
          if (threadId && content.trim()) {
            pushFullMem(threadId, "assistant", content);
            maybeIndexStructured(threadId, content);
          }
          if (stableThreadId) {
            try { pushFullMem(stableThreadId, "assistant", content); } catch {}
          }
          return;
        }

        if (j?.completion) {
          const content = j.completion;
          setMessages(prev => prev.map(m =>
            m.id === pendingId ? { ...m, content, pending: false } : m
          ));
          if (threadId && content.trim()) {
            pushFullMem(threadId, "assistant", content);
            maybeIndexStructured(threadId, content);
          }
          if (stableThreadId) {
            try { pushFullMem(stableThreadId, "assistant", content); } catch {}
          }
        } else if (j?.starter) {
          const content = j.starter;
          setMessages(prev => prev.map(m =>
            m.id === pendingId ? { ...m, content, pending: false } : m
          ));
          if (threadId && content.trim()) {
            pushFullMem(threadId, "assistant", content);
            maybeIndexStructured(threadId, content);
          }
          if (stableThreadId) {
            try { pushFullMem(stableThreadId, "assistant", content); } catch {}
          }
        } else {
          const content = '⚠ Empty response from server.';
          setMessages(prev => prev.map(m =>
            m.id === pendingId
              ? { ...m, content, pending: false, error: 'Empty response from server.' }
              : m
            ));
          if (threadId && content.trim()) {
            pushFullMem(threadId, "assistant", content);
            maybeIndexStructured(threadId, content);
          }
          if (stableThreadId) {
            try { pushFullMem(stableThreadId, "assistant", content); } catch {}
          }
        }
        return;
      }
      const intent = detectFollowupIntent(text);
      const follow = isFollowUp(text);
      const ctx = ui.contextFrom ? active : null;
      if (!ui.topic && !intent) setUi(prev => ({ ...prev, topic: text }));
      else if (isNewTopic(text)) setUi(prev => ({ ...prev, topic: text }));

      // ADD: intercept follow-ups with no active doc context by using full conversation memory
      if (follow && !ctx) {
        // Build a normal prompt but with fullContext injected (see step 2).
        // Do not return here; let it flow into your normal LLM call with contextBlock included.
      }

      // Only show the "no context" warning if there is truly no stored conversation
      if (follow && !ctx && !(intent && ui.topic)) {
        const hasAnyMemory = !!buildFullContext(stableThreadId);
        if (!hasAnyMemory) {
          const warn = "I don't have context from earlier in this session. Please reattach or restate it if you'd like me to use it.";
          setMessages(prev =>
            prev.map(m =>
              m.id === pendingId
                ? { ...m, pending: false, content: warn }
                : m
            )
          );
          if (threadId && warn.trim()) {
            pushFullMem(threadId, "assistant", warn);
            maybeIndexStructured(threadId, warn);
          }
          if (stableThreadId) {
            try { pushFullMem(stableThreadId, "assistant", warn); } catch {}
          }
          setBusy(false);
          return;
        }
        // else: proceed to normal LLM call with contextBlock (added above)
      }

      // === ADD-ONLY: domain style selection ===
      let DOMAIN_STYLE = "";
      try {
        const d = detectDomain(userText);
        if (d === "allied")      DOMAIN_STYLE = DomainStyles.ALLIED_STYLE;
        else if (d === "wellness")   DOMAIN_STYLE = DomainStyles.WELLNESS_STYLE;
        else if (d === "technical")  DOMAIN_STYLE = DomainStyles.TECHNICAL_SCI_STYLE;
        else if (d === "behavioral") DOMAIN_STYLE = DomainStyles.BEHAVIORAL_STYLE;
        else if (d === "supportive") DOMAIN_STYLE = DomainStyles.SUPPORTIVE_STYLE;
        else if (d === "compliance") DOMAIN_STYLE = DomainStyles.COMPLIANCE_STYLE;
      } catch {}

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

      const sys = topicHint + systemCommon + baseSys;
      const sysWithDomain = DOMAIN_STYLE ? `${sys}\n\n${DOMAIN_STYLE}` : sys;
      let ADV_STYLE = "";
      const adv = detectAdvancedDomain(userText);
      if (adv) {
        const D = await import("@/lib/prompts/advancedDomains");
        ADV_STYLE =
          adv === "behav-med"      ? D.BEHAV_MED_STYLE :
          adv === "env-occ"        ? D.ENV_OCC_STYLE :
          adv === "data-tech"      ? D.DATA_TECH_STYLE :
          adv === "genomics"       ? D.GENOMICS_STYLE :
          adv === "preventive"     ? D.PREVENTIVE_STYLE :
          adv === "systems-policy" ? D.SYSTEMS_POLICY_STYLE : "";
      }
      const systemAll = `${sysWithDomain}${ADV_STYLE ? "\n\n" + ADV_STYLE : ""}`;
      let chatMessages: { role: string; content: string }[];

      const looksLikeMath = /[0-9\.\s+\-*\/^()]{6,}/.test(userText) || /sin|cos|log|sqrt|derivative|integral|limit/i.test(userText);
      let toolBlock = "";
      if (looksLikeMath) {
        try { const res = await computeEval(userText); toolBlock = `\n\nTOOL RESULT:\n${res}`; } catch {}
      }
      const historyIntent = /\b(empire|war|dynasty|revolution|treaty|reign)\b/i.test(userText);
      const doctorIntent = mode === "doctor" || /\b(symptom|diagnosis|treatment|disease|syndrome|pain|infection|therapy|medication)\b/i.test(userText);

      if (looksLikeMath) {
        const STYLE_MATH = `You are a rigorous solver. Show: (1) setup, (2) key steps, (3) final answer WITH UNITS, (4) quick self-check. Do not reveal hidden reasoning.`;
        chatMessages = [
          { role: "system", content: `${systemAll}\n\n${STYLE_MATH}` },
          { role: "user", content: `${userText}${toolBlock}${contextBlock}` }
        ];
      } else if (historyIntent) {
        const { HISTORY_STYLE: STYLE_HISTORY } = await import("@/lib/prompts/history");
        chatMessages = [
          { role: "system", content: `${systemAll}\n\n${STYLE_HISTORY}` },
          { role: "user", content: `${userText}${contextBlock}` }
        ];
      } else if (doctorIntent) {
        const { DOCTOR_STYLE: STYLE_DOCTOR } = await import("@/lib/prompts/doctor");
        chatMessages = [
          { role: "system", content: `${systemAll}\n\n${STYLE_DOCTOR}` },
          { role: "user", content: `${userText}${contextBlock}` }
        ];
      }

      if (!chatMessages && intent && ui.topic) {
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
        chatMessages[1].content += contextBlock;
      } else if (!chatMessages && follow && ctx) {
        const fullMem = fullContext;
        const system = `You are MedX. This is a FOLLOW-UP.
Here is the ENTIRE conversation so far:
${fullMem || "(none)"}

${systemCommon}` + baseSys;
        const systemWithDomain = DOMAIN_STYLE ? `${system}\n\n${DOMAIN_STYLE}` : system;
        const systemAll = `${systemWithDomain}${ADV_STYLE ? "\n\n" + ADV_STYLE : ""}`;
        const userMsg = `Follow-up: ${text}\nIf the question is ambiguous, ask one concise disambiguation question and then answer briefly using the context.`;
        chatMessages = [
          { role: 'system', content: systemAll },
          { role: 'user', content: `${userMsg}${contextBlock}` }
        ];
      } else if (!chatMessages) {
        const plan = await safeJson(
          fetch('/api/medx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: text, mode, researchMode, filters })
          })
        );

        const sys = topicHint + systemCommon + baseSys;
        const sysWithDomain = DOMAIN_STYLE ? `${sys}\n\n${DOMAIN_STYLE}` : sys;
        const systemAll = `${sysWithDomain}${ADV_STYLE ? "\n\n" + ADV_STYLE : ""}`;
        const planContextBlock = 'CONTEXT:\n' + JSON.stringify(plan.sections || {}, null, 2);
        chatMessages = [
          { role: 'system', content: systemAll },
          { role: 'user', content: `${text}\n\n${planContextBlock}${contextBlock}` }
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
      if (threadId && main && main.trim()) {
        pushFullMem(threadId, "assistant", main);
        maybeIndexStructured(threadId, main);
      }
      if (stableThreadId) {
        try { pushFullMem(stableThreadId, "assistant", main); } catch {}
      }
      if (main.length > 400) {
        setFromChat({ id: pendingId, content: main });
        setUi(prev => ({ ...prev, contextFrom: 'Conversation summary' }));
      }
    } catch (e: any) {
      console.error(e);
      const content = `⚠️ ${String(e?.message || e)}`;
      setMessages(prev =>
        prev.map(m =>
          m.id === pendingId
            ? {
                ...m,
                content,
                pending: false,
                error: String(e?.message || e)
              }
            : m
        )
      );
      if (threadId && content.trim()) {
        pushFullMem(threadId, "assistant", content);
        maybeIndexStructured(threadId, content);
      }
      if (stableThreadId) {
        try { pushFullMem(stableThreadId, "assistant", content); } catch {}
      }
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

    // Regular chat flow (file or note)
    if (!pendingFile && !note.trim()) return;
    if (pendingFile) {
      await analyzeFile(pendingFile, note);
    } else {
      await send(note, researchMode);
      if (enabled) {
        try {
          const res = await fetch('/api/memory/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: note, thread_id: threadId }),
          });
          if (res.ok) {
            const { suggestions } = await res.json();
            for (const s of (suggestions || [])) {
              if (rememberThisThread && s.scope === 'thread') s.source = 'manual';
              if (autoSave) {
                try {
                  const saveRes = await fetch('/api/memory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(s),
                  });
                  if (saveRes.ok) {
                    const json = await saveRes.json();
                    const saved = json?.items?.[0];
                    const label =
                      s.key === 'allergy' && s.value?.item ? `allergy: ${s.value.item}` :
                      s.key === 'diet_preference' && s.value?.label ? `diet: ${s.value.label}` :
                      s.key === 'medication' && s.value?.name ? `medication: ${s.value.name}` :
                      s.key;
                    if (saved?.id) setLastSaved({ id: saved.id, label });
                  } else {
                    console.error('Auto-save failed', saveRes.status, await saveRes.text());
                  }
                } catch (e) {
                  console.error('Auto-save error', e);
                }
              } else {
                pushSuggestion(s);
              }
            }
          }
        } catch (err) {
          console.error('Memory suggest failed', err);
        }
      }
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
      {mode === "doctor" && researchMode && (
        <>
          <ResearchFilters mode="research" onResults={handleTrials} />
          {searched && trialRows.length === 0 && (
            <div className="text-gray-600 text-sm my-2 mx-4 md:mx-4">
              No trials found. Try removing a filter, switching country, or using broader keywords.
            </div>
          )}
          {summary && (
            <div className="my-2 mx-4 text-sm p-3 rounded border bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">
                  {mode === "doctor" ? <Stethoscope size={16}/> : <Users size={16}/>}
                </div>

                <div className="flex-1 whitespace-pre-wrap">{summary}</div>

                <div className="flex items-center gap-2">
                  {stats?.recruitingCount ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
                      • Recruiting: {stats.recruitingCount}
                    </span>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(summary!)}
                    className="px-2 py-1 text-xs border rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                    title="Copy summary"
                  >
                    <span className="inline-flex items-center gap-1">
                      <Clipboard size={14}/> Copy
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDetails(s => !s)}
                    className="px-2 py-1 text-xs border rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                    title="View details"
                  >
                    <span className="inline-flex items-center gap-1">
                      {showDetails ? <ChevronUp size={14}/> : <ChevronDown size={14}/> }
                      {showDetails ? "Hide details" : "View details"}
                    </span>
                  </button>
                </div>
              </div>

              {showDetails && stats && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Phases */}
                  <div className="rounded border bg-white dark:bg-slate-900 dark:border-slate-700">
                    <div className="px-3 py-2 font-medium border-b dark:border-slate-700">Phases</div>
                    <ul className="px-3 py-2 space-y-1">
                      {Object.entries(stats.byPhase).sort((a,b)=>b[1]-a[1]).map(([k,v])=>(
                        <li key={k} className="flex justify-between"><span>Phase {k}</span><span>{v}</span></li>
                      ))}
                      {Object.keys(stats.byPhase).length===0 && <li className="text-slate-500">—</li>}
                    </ul>
                  </div>

                  {/* Statuses */}
                  <div className="rounded border bg-white dark:bg-slate-900 dark:border-slate-700">
                    <div className="px-3 py-2 font-medium border-b dark:border-slate-700">Statuses</div>
                    <ul className="px-3 py-2 space-y-1">
                      {Object.entries(stats.byStatus).sort((a,b)=>b[1]-a[1]).map(([k,v])=>(
                        <li key={k} className="flex justify-between"><span>{k}</span><span>{v}</span></li>
                      ))}
                      {Object.keys(stats.byStatus).length===0 && <li className="text-slate-500">—</li>}
                    </ul>
                  </div>

                  {/* Countries */}
                  <div className="rounded border bg-white dark:bg-slate-900 dark:border-slate-700">
                    <div className="px-3 py-2 font-medium border-b dark:border-slate-700">Top countries</div>
                    <ul className="px-3 py-2 space-y-1">
                      {Object.entries(stats.byCountry).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>(
                        <li key={k} className="flex justify-between"><span>{k}</span><span>{v}</span></li>
                      ))}
                      {Object.keys(stats.byCountry).length===0 && <li className="text-slate-500">—</li>}
                    </ul>
                  </div>

                  {/* Genes */}
                  <div className="rounded border bg-white dark:bg-slate-900 dark:border-slate-700">
                    <div className="px-3 py-2 font-medium border-b dark:border-slate-700">Top genes</div>
                    <ul className="px-3 py-2 space-y-1">
                      {stats.genesTop.length ? stats.genesTop.map(([g,c])=>(
                        <li key={g} className="flex justify-between"><span>{g}</span><span>{c}</span></li>
                      )) : <li className="text-slate-500">—</li>}
                    </ul>
                  </div>

                  {/* Conditions */}
                  <div className="rounded border bg-white dark:bg-slate-900 dark:border-slate-700">
                    <div className="px-3 py-2 font-medium border-b dark:border-slate-700">Top conditions</div>
                    <ul className="px-3 py-2 space-y-1">
                      {stats.conditionsTop.length ? stats.conditionsTop.map(([k,c])=>(
                        <li key={k} className="flex justify-between capitalize"><span>{k}</span><span>{c}</span></li>
                      )) : <li className="text-slate-500">—</li>}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
          {trialRows.length > 0 && (
            <div className="mx-4 md:mx-4">
              <div className="flex justify-end mb-2">
                <button
                  onClick={async ()=>{
                    const res = await fetch("/api/trials/export", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ rows: trialRows }) });
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = "trials.csv"; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-2 py-1 text-xs border rounded"
                >
                  Export CSV
                </button>
              </div>
              <TrialsTable rows={trialRows} />
            </div>
          )}
        </>
      )}
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
                <ChatMarkdown content={m.content} />
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
            className="w-full flex items-center gap-3 rounded-full medx-glass px-3 py-2"
          >
            <label
              className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md medx-surface text-medx"
              title="Upload PDF or image"
            >
              <Paperclip size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Upload</span>
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
            {/* REPLACE the single-line <input> with this <textarea> */}
            <textarea
              ref={inputRef as unknown as RefObject<HTMLTextAreaElement>}
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none text-sm md:text-base leading-6 placeholder:text-slate-500 dark:placeholder:text-slate-400 px-2 text-medx"
              placeholder={
                pendingFile
                  ? 'Add a note or question for this document (optional)'
                  : 'Send a message'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                // Send on Enter (no Shift), allow newline on Shift+Enter.
                // Respect IME composition (don’t send while composing).
                // NOTE: keep behavior identical to ChatGPT.
                const isComposing = (e.nativeEvent as any).isComposing;
                if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
            />
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg medx-btn-accent disabled:opacity-50"
              type="submit"
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
