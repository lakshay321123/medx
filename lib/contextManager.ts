export type Mode = "patient" | "doctor" | "research";
export type Intent = "overview" | "research" | "generate" | "resources";

export interface ContextState {
  mainTopic: string | null;
  subtopics: string[];
  mode: Mode;
}

let sessionContext: Record<string, ContextState> = {};

export function getContext(sessionId: string): ContextState {
  return sessionContext[sessionId] ?? { mainTopic: null, subtopics: [], mode: "patient" };
}

export function updateContext(sessionId: string, topic?: string, subtopic?: string, mode?: Mode) {
  const ctx = getContext(sessionId);
  if (topic) ctx.mainTopic = topic;
  if (subtopic) ctx.subtopics.push(subtopic);
  if (mode) ctx.mode = mode;
  sessionContext[sessionId] = ctx;
}

export function resetContext(sessionId: string) {
  sessionContext[sessionId] = { mainTopic: null, subtopics: [], mode: "patient" };
}
