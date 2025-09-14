export type ActionId =
  | "summarize"
  | "triage"
  | "make_timeline"
  | "pdf"
  | "share"
  | "expand_details";

export type ProposedAction = {
  actionId: ActionId;
  payload?: any;
  expiresAt?: number; // ms epoch
};

// Every assistant message may carry a non-UI hint:
export type AssistantMessage = {
  id: string;
  role: "assistant";
  text: string;
  threadId: string;
  proposedAction?: ProposedAction;
  suggestions?: Array<{ id: string; label: string }>;
};
