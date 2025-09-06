import { Intent } from "./contextManager";

export function detectIntent(query: string): Intent {
  const q = query.toLowerCase();
  if (q.includes("latest") || q.includes("research") || q.includes("studies") || q.includes("clinical"))
    return "research";
  if (q.includes("book") || q.includes("resource")) return "resources";
  if (q.includes("paper") || q.includes("long form") || q.includes("5000"))
    return "generate";
  return "overview";
}
