import { Intent } from "./contextManager";

export function detectIntent(userQuery: string): { intent: Intent; confidence: number } {
  const q = userQuery.toLowerCase();
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
  return { intent: "overview", confidence: 0.4 };
}

export function parseQuickChoice(q: string): Intent | null {
  const s = q.trim().toLowerCase();
  if (/^(\(?a\)?|1|①|option a)$/.test(s)) return "research";
  if (/^(\(?b\)?|2|②|option b)$/.test(s)) return "resources";
  if (/^(\(?c\)?|3|③|option c)$/.test(s)) return "generate";
  return null;
}
