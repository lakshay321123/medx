export type Mode = "patient" | "doctor" | "research";
export type Intent = "overview" | "research" | "generate" | "resources";

export type AwaitingState =
  | { type: "topic_confirm"; proposed: string }
  | { type: "intent_confirm"; intent: Intent; target: string }
  | { type: "branch_choice"; choices: string[] }
  | null;

export interface ContextState {
  mainTopic: string | null;
  subtopics: string[];
  mode: Mode;
  lastIntent?: Intent;
  lastQuestion?: string;
  awaiting: AwaitingState;
}

let sessionContext: Record<string, ContextState> = {};

export function getContext(sessionId: string): ContextState {
  if (!sessionContext[sessionId]) {
    sessionContext[sessionId] = {
      mainTopic: null,
      subtopics: [],
      mode: "patient",
      awaiting: null,
    };
  }
  return sessionContext[sessionId];
}

export function updateContext(
  sessionId: string,
  topic?: string,
  subtopic?: string,
  mode?: Mode
) {
  const ctx = getContext(sessionId);
  if (topic) ctx.mainTopic = topic;
  if (subtopic) ctx.subtopics.push(subtopic);
  if (mode) ctx.mode = mode;
  sessionContext[sessionId] = ctx;
}

export function resetContext(sessionId: string) {
  sessionContext[sessionId] = {
    mainTopic: null,
    subtopics: [],
    mode: "patient",
    awaiting: null,
  };
}
