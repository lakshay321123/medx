import type { Citation } from "@/lib/research/orchestrator";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  // followUps may be legacy string arrays or Suggestion objects; normalize before use
  followUps?: unknown;
  citations?: Citation[];
};
