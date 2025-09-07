import type { Citation, ResearchFilters } from "@/lib/research/orchestrator";

export type AssistantMessage = {
  role: "assistant";
  text: string;
  payload?: {
    kind: "trials_table";
    columns: { key: string; label: string }[];
    rows: Array<{
      title: { text: string; href?: string };
      phase: string; status: string; condition: string; intervention: string;
      registry: string; country: string;
    }>;
    meta?: { total?: number };
    filters?: ResearchFilters;
  };
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  followUps?: string[];
  citations?: Citation[];
};
