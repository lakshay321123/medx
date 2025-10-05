import type { Citation } from "@/lib/research/orchestrator";

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
};

export type ComposerMeta = { label?: "upload" | "study" | "thinking" } | null;

// Backwards compatibility for older imports; prefer ComposerMeta going forward.
export type ComposerDropupMeta = ComposerMeta;
