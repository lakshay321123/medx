export type Thread = { id: string; title: string; createdAt: number; updatedAt: number; mode: "patient"|"doctor"; };
export type ChatMsg = { id: string; role: "user"|"assistant"; content: string; ts: number; };

const LS_KEY = "medx.chat.threads";
const LS_MSG = (id:string)=>`medx.chat.thread.${id}.msgs`;

export const createNewThreadId = () => crypto.randomUUID();

export function listThreads(): Thread[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
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
export function ensureThread(id: string, initialTitle = "New chat"): Thread {
  const all = listThreads();
  const existing = all.find(t=>t.id===id);
  if (existing) return existing;
  const t: Thread = { id, title: initialTitle, createdAt: Date.now(), updatedAt: Date.now(), mode: "patient" };
  saveThreads([t, ...all]);
  return t;
}
export function renameThread(id:string, title:string){
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
    all[idx] = { ...all[idx], title, updatedAt: Date.now() };
    saveThreads(all);
    window.dispatchEvent(new Event("chat-threads-updated"));
  }
}
