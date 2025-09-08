export type ShortRole = "user" | "assistant";
export type ShortMsg = { role: ShortRole; text: string; ts: number };

const key = (threadId: string) => `chat:${threadId}:fullmem`;

function sanitize(text: string) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000); // cap per-message length, not count
}

export function getFullMem(threadId: string): ShortMsg[] {
  try {
    const raw = localStorage.getItem(key(threadId));
    const arr = raw ? (JSON.parse(raw) as ShortMsg[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function pushFullMem(threadId: string, role: ShortRole, text: string) {
  try {
    const arr = getFullMem(threadId);
    arr.push({ role, text: sanitize(text), ts: Date.now() });
    localStorage.setItem(key(threadId), JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

/** Build context from the *entire* conversation */
export function buildFullContext(threadId: string): string {
  const mem = getFullMem(threadId);
  if (!mem.length) return "";

  // Join everything as role-tagged turns
  const turns = mem
    .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
    .join("\n");

  return turns.slice(0, 20000); // safety cap so prompt doesn’t blow up
}
