export type Thread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mode: "patient" | "doctor";
  therapy?: boolean;
};
export type ChatMsg = { id: string; role: "user"|"assistant"; content: string; ts: number; };

const LS_KEY = "medx.chat.threads";
const LS_MSG = (id:string)=>`medx.chat.thread.${id}.msgs`;

const UNTITLED_TITLES = new Set(
  [
    "New chat",
    "नई चैट",
    "محادثة جديدة",
    "Nuova chat",
    "新建对话",
    "Nueva conversación",
  ].map(title => title.toLowerCase()),
);

export function normalizeThreadTitle(title?: string | null): string {
  if (typeof title !== "string") return "";
  const trimmed = title.trim();
  if (!trimmed) return "";
  return UNTITLED_TITLES.has(trimmed.toLowerCase()) ? "" : trimmed;
}

export const createNewThreadId = () => crypto.randomUUID();

type CreateThreadOpts = {
  title?: string;
  mode?: "patient" | "doctor";
  therapy?: boolean;
};

export async function createThread(opts: CreateThreadOpts = {}): Promise<Thread> {
  const now = Date.now();
  const id = createNewThreadId();
  const thread: Thread = {
    id,
    title: normalizeThreadTitle(opts.title),
    createdAt: now,
    updatedAt: now,
    mode: opts.mode ?? "patient",
  };
  if (opts.therapy) thread.therapy = true;

  const existing = listThreads();
  try {
    saveThreads([thread, ...existing]);
  } catch (err) {
    throw err instanceof Error
      ? err
      : new Error("Failed to save new chat thread");
  }

  try {
    upsertThreadIndex(thread.id, thread.title);
  } catch {}

  return thread;
}

export function listThreads(): Thread[] {
  try {
    const raw = localStorage.getItem(LS_KEY) || "[]";
    const parsed = JSON.parse(raw) as Thread[];
    return Array.isArray(parsed)
      ? parsed.map(thread => ({ ...thread, title: normalizeThreadTitle(thread?.title) }))
      : [];
  } catch {
    return [];
  }
}
export function saveThreads(list: Thread[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0,200)));
  window.dispatchEvent(new Event('chat-threads-updated'));
}
export function loadMessages(id: string): ChatMsg[] {
  try { return JSON.parse(localStorage.getItem(LS_MSG(id)) || "[]"); } catch { return []; }
}
export function saveMessages(id: string, msgs: ChatMsg[]) {
  localStorage.setItem(LS_MSG(id), JSON.stringify(msgs.slice(-500)));
}
export function ensureThread(id: string, initialTitle = ""): Thread {
  const all = listThreads();
  const existing = all.find(t=>t.id===id);
  if (existing) {
    // keep index in sync for existing threads
    try { upsertThreadIndex(existing.id, existing.title); } catch {}
    return existing;
  }
  const t: Thread = {
    id,
    title: normalizeThreadTitle(initialTitle),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    mode: "patient",
  };
  saveThreads([t, ...all]);
  try { upsertThreadIndex(t.id, t.title); } catch {}
  return t;
}
export function renameThreadLegacy(id:string, title:string){
  const all = listThreads().map(t=>t.id===id?{...t,title,updatedAt:Date.now()}:t);
  saveThreads(all);
}

export function generateTitle(text: string) {
  const t = (text || "").trim().replace(/\s+/g, " ").replace(/^[\s"'`]+|[\s"'`]+$/g, "");
  const strip = t.replace(/^(tell me about|explain|research (on|about)|what is|how to|help with)\s+/i, "");
  return strip.length <= 48 ? strip : strip.slice(0, 48).replace(/\s+\S*$/, "") + "…";
}

export function updateThreadTitle(id: string, title: string) {
  const all = listThreads();
  const idx = all.findIndex(t => t.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], title: normalizeThreadTitle(title), updatedAt: Date.now() };
    saveThreads(all);
    window.dispatchEvent(new Event("chat-threads-updated"));
  }
}

// ---- ADD: light-weight thread index helpers (localStorage) ----
const THREADS_INDEX_KEY = "chat:threads:index"; // array of {id,title,updatedAt}

type ThreadMeta = { id: string; title: string; updatedAt: number };

export function getThreadsIndex(): ThreadMeta[] {
  try {
    const raw = localStorage.getItem(THREADS_INDEX_KEY);
    return raw ? (JSON.parse(raw) as ThreadMeta[]) : [];
  } catch {
    return [];
  }
}

export function upsertThreadIndex(id: string, title: string) {
  const list = getThreadsIndex();
  const idx = list.findIndex(t => t.id === id);
  const meta: ThreadMeta = { id, title: normalizeThreadTitle(title), updatedAt: Date.now() };
  if (idx >= 0) list[idx] = meta; else list.unshift(meta);
  try { localStorage.setItem(THREADS_INDEX_KEY, JSON.stringify(list)); } catch {}
}

export function deleteFromThreadIndex(id: string) {
  const list = getThreadsIndex().filter(t => t.id !== id);
  try { localStorage.setItem(THREADS_INDEX_KEY, JSON.stringify(list)); } catch {}
}

// ---- ADD: delete + rename (localStorage scoped) ----
export function deleteThread(threadId: string) {
  try {
    // messages
    localStorage.removeItem(`chat:${threadId}:messages`);
    // per-thread UI state
    localStorage.removeItem(`chat:${threadId}:ui`);
    // any draft
    localStorage.removeItem(`chat:${threadId}:draft`);
    // index
    deleteFromThreadIndex(threadId);
    // remove from legacy list
    const remaining = listThreads().filter(t => t.id !== threadId);
    saveThreads(remaining);
  } catch {}
}

export function renameThread(threadId: string, newTitle: string) {
  try {
    // your existing title updater (kept)
    updateThreadTitle(threadId, newTitle);
    // reflect in index
    upsertThreadIndex(threadId, newTitle);
  } catch {}
}
