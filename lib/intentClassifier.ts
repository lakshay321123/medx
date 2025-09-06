import { Intent } from "./contextManager";

export interface IntentResult {
  intent: Intent | "unknown";
  confidence: number;
}

export function detectIntent(query: string): IntentResult {
  const q = query.toLowerCase();

  if (q.includes("latest") || q.includes("research") || q.includes("studies") || q.includes("clinical")) {
    return { intent: "research", confidence: 0.9 };
  }

  if (q.includes("book") || q.includes("resource")) {
    return { intent: "resources", confidence: 0.9 };
  }

  if (q.includes("paper") || q.includes("long form") || q.includes("5000")) {
    return { intent: "generate", confidence: 0.8 };
  }

  if (q.includes("what is") || q.includes("overview")) {
    return { intent: "overview", confidence: 0.95 };
  }

  return { intent: "unknown", confidence: 0.4 };
}
