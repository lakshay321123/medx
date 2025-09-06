import type { Citation } from "@/lib/research/orchestrator";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  followUps?: string[];
  citations?: Citation[];
};
