import { useSyncExternalStore } from 'react';

export type ActiveContext = {
  id: string;
  kind: 'analysis' | 'chat';
  title: string;
  summary: string;
  entities?: string[];
  createdAt: number;
};

export type AnalysisCategory =
  | 'xray'
  | 'lab_report'
  | 'prescription'
  | 'discharge_summary'
  | 'other_medical_doc';

export type ChatMessage =
  | { id: string; role: 'user'; kind: 'chat'; content: string }
  | { id: string; role: 'assistant'; kind: 'chat'; content: string }
  | {
      id: string;
      role: 'assistant';
      kind: 'analysis';
      category?: AnalysisCategory;
      content: string;
    };

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(l => l());
}

function load(): ActiveContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('activeContext');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(ctx: ActiveContext | null) {
  if (typeof window === 'undefined') return;
  if (ctx) sessionStorage.setItem('activeContext', JSON.stringify(ctx));
  else sessionStorage.removeItem('activeContext');
}

export const activeContextRef: { current: ActiveContext | null } = { current: load() };

export function useActiveContext() {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => activeContextRef.current,
    () => activeContextRef.current
  );
}

function update(ctx: ActiveContext | null) {
  activeContextRef.current = ctx;
  save(ctx);
  emit();
}

export function clearActiveContext() {
  update(null);
}

export function setActiveFromAnalysis(msg: Extract<ChatMessage, { kind: 'analysis' }>) {
  const title =
    msg.category === 'lab_report'
      ? 'Lab Report Summary'
      : msg.category === 'xray'
      ? 'Imaging Report'
      : 'Medical Document Summary';
  const summary = trimToTokens(msg.content, 1600);
  const entities = extractEntitiesHeuristic(msg.content);
  update({ id: msg.id, kind: 'analysis', title, summary, entities, createdAt: Date.now() });
}

export function setActiveFromChat(
  msg: Extract<ChatMessage, { kind: 'chat'; role: 'assistant' }>
) {
  const summary = trimToTokens(msg.content, 1600);
  const entities = extractEntitiesHeuristic(msg.content);
  update({
    id: msg.id,
    kind: 'chat',
    title: 'Conversation summary',
    summary,
    entities,
    createdAt: Date.now(),
  });
}

export function getActiveContext() {
  return activeContextRef.current;
}

export function extractEntitiesHeuristic(text: string): string[] {
  const nouns = Array.from(
    new Set(
      text.match(/\b([A-Z][a-z0-9\-]+(?:\s+[A-Z][a-z0-9\-]+){0,2})\b/g) || []
    )
  );
  return nouns
    .filter(w =>
      /\b(cancer|tumor|diabetes|hypertension|x[- ]?ray|ct|mri|chemotherapy|trial|drug|dose|mg|mm)\b/i.test(
        text + ' ' + w
      )
    )
    .slice(0, 8);
}

export function trimToTokens(s: string, approxTokens = 1600) {
  const maxChars = approxTokens * 4;
  return s.length > maxChars ? s.slice(0, maxChars) + '…' : s;
}
