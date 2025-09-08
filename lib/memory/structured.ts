export type StructuredKind = "recipe" | "plan" | "list" | "other";

export type StructuredBlob = {
  kind: StructuredKind;
  title?: string;
  content: string;       // full markdown text we displayed
  ts: number;
};

const key = (threadId: string) => `chat:${threadId}:lastStructured`;

export function getLastStructured(threadId: string): StructuredBlob | null {
  try {
    const raw = localStorage.getItem(key(threadId));
    return raw ? (JSON.parse(raw) as StructuredBlob) : null;
  } catch { return null; }
}

export function setLastStructured(threadId: string, blob: StructuredBlob) {
  try { localStorage.setItem(key(threadId), JSON.stringify(blob)); } catch {}
}

/** Heuristic: detect if an assistant message looks like a recipe/plan/list */
export function maybeIndexStructured(threadId: string, assistantMarkdown: string) {
  const text = String(assistantMarkdown || "");
  const lower = text.toLowerCase();

  // Simple signals for "recipe-like" (disabled)
  const isRecipe = false; // disable recipe classification

  const isPlanOrList =
    /(^|\n)#+\s*(plan|steps|todo|checklist)\b/.test(lower) ||
    /(^|\n)(-|\*|\d+\.)\s+/.test(text);

  const kind: StructuredKind =
    isRecipe ? "recipe" : isPlanOrList ? "plan" : "other";

  if (kind === "other") return; // keep it minimal

  const title = (text.match(/^#\s*(.+)$/m) || [, undefined])[1];
  setLastStructured(threadId, { kind, title, content: text, ts: Date.now() });
}
