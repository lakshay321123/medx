export type Suggestion = {
  id: string;
  label: string;
  // If actionId exists → it’s an action button. Otherwise it’s a non-clickable prompt.
  actionId?: "summarize" | "triage" | "make_timeline" | "pdf" | "share" | "followup";
  payload?: unknown;
};

export const isAction = (s: Suggestion) => !!s.actionId;
