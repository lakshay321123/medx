export type ActionId =
  | "summarize"
  | "triage"
  | "make_timeline"
  | "pdf"
  | "share"
  | "expand_details"; // for “details on causes/treatments?”-type asks

export type ProposedAction = {
  actionId: ActionId;
  payload?: any;             // e.g., { section: "causes_treatments" }
  expiresAt?: number;        // optional TTL (ms since epoch)
};

// Every assistant message may carry a non-UI hint:
export type AssistantMessage = {
  id: string;
  role: "assistant";
  text: string;
  proposedAction?: ProposedAction; // ← new
  suggestions?: Array<{ id: string; label: string; actionId?: ActionId }>;
};
