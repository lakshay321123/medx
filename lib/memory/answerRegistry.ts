export type AnswerTag =
  | "diet" | "recipe" | "plan" | "workout" | "dosage" | "meds"
  | "symptoms" | "labs" | "guidelines" | "trials" | "general";

export type AnswerSnap = {
  id: string;
  ts: number;
  title?: string;
  tags: AnswerTag[];
  content: string;   // markdown we showed
};

const key = (threadId: string) => `chat:${threadId}:answers`;

export function getAnswers(threadId: string): AnswerSnap[] {
  try {
    const raw = localStorage.getItem(key(threadId));
    const arr = raw ? (JSON.parse(raw) as AnswerSnap[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function setAnswers(threadId: string, snaps: AnswerSnap[]) {
  try { localStorage.setItem(key(threadId), JSON.stringify(snaps)); } catch {}
}

export function indexAnswer(threadId: string, markdown: string) {
  const content = String(markdown || "").trim();
  if (!content) return;

  const lower = content.toLowerCase();
  const tags: AnswerTag[] = [];
  const has = (re: RegExp) => re.test(lower);

  // very small, safe heuristics
  if (has(/\bdiet\b|\bnutrition\b/)) tags.push("diet");
  if (has(/\brecipe\b|ingredients|instructions|method/)) tags.push("recipe");
  if (has(/\bplan\b|steps|checklist/)) tags.push("plan");
  if (has(/\bworkout\b|exercise|yoga|walk|cardio|strength/)) tags.push("workout");
  if (has(/\bdose|dosage|mg\b/)) tags.push("dosage");
  if (has(/\bmedication|medicine|drug\b/)) tags.push("meds");
  if (has(/\bsymptom\b/)) tags.push("symptoms");
  if (has(/\blab\b|hba1c|ldl|hdl|tsh|crp|platelets|wbc/)) tags.push("labs");
  if (has(/\bguideline|recommendation/i)) tags.push("guidelines");
  if (has(/\bclinical trial|nct|phase\b/)) tags.push("trials");
  if (!tags.length) tags.push("general");

  const title = (content.match(/^#\s*(.+)$/m) || [, undefined])[1];

  const snaps = getAnswers(threadId);
  snaps.push({ id: crypto.randomUUID(), ts: Date.now(), title, tags, content });
  // optional soft cap (keep newest 200)
  setAnswers(threadId, snaps.slice(-200));
}

export function findLatestByTag(threadId: string, tag: AnswerTag): AnswerSnap | null {
  const snaps = getAnswers(threadId);
  for (let i = snaps.length - 1; i >= 0; i--) {
    if (snaps[i].tags.includes(tag)) return snaps[i];
  }
  return null;
}

export function getLastAnswer(threadId: string): AnswerSnap | null {
  const snaps = getAnswers(threadId);
  return snaps.length ? snaps[snaps.length - 1] : null;
}

