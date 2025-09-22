import type { Citation } from "@/lib/research/orchestrator";

export type ChatAttachment = {
  id: string;
  kind: "image" | "file";
  name: string;
  mime: string;
  url: string;
  width?: number;
  height?: number;
  bytes?: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  text?: string;
  attachments?: ChatAttachment[];
  ts?: number;
  // followUps may be legacy string arrays or Suggestion objects; normalize before use
  followUps?: unknown;
  citations?: Citation[];
};
