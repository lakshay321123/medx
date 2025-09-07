export type ConversationState = {
  topic?: string;                     // short label for active topic (e.g., "fitness/abs", "ui/palette")
  intents: string[];                  // ordered, most-recent first
  facts: Record<string, string>;      // normalized facts (height: "178 cm", weight: "80 kg")
  preferences: Record<string, string>; // e.g., diet: "non-veg", tone: "concise"
  decisions: string[];                // choices made ("Use blue palette")
  open_questions: string[];           // pending clarifications
  last_updated_iso: string;           // ISO timestamp
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
