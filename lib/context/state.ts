export type ConversationState = {
  topic?: string;
  intents: string[];
  facts: Record<string, string>;
  preferences: Record<string, string>;
  decisions: string[];
  open_questions: string[];
  last_updated_iso: string;
};

export const EMPTY_STATE: ConversationState = {
  topic: undefined,
  intents: [],
  facts: {},
  preferences: {},
  decisions: [],
  open_questions: [],
  last_updated_iso: new Date().toISOString(),
};
