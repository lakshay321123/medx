export type ChatRole = "user" | "assistant" | "system";

export type BuildContextOptions = {
  mode: "patient" | "doctor";
  researchOn: boolean;
  maxRecent?: number;      // how many recent messages to include (default 10)
  maxSummaryChars?: number; // compact summary cap (default 1,500)
};

export type OutOfContextDecision = {
  isOutOfContext: boolean;
  reason?: string;
  similarity?: number; // 0..1
};
