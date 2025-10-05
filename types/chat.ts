import type { Citation } from "@/lib/research/orchestrator";
import type { FormatId } from "@/lib/formats/types";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  // followUps may be legacy string arrays or Suggestion objects; normalize before use
  followUps?: unknown;
  citations?: Citation[];
  originUserText?: string;
  replacedByNewer?: boolean;
  replacedByMessageId?: string;
  refreshOf?: string;
  formatId?: FormatId;
  userPrompt?: string;
};
