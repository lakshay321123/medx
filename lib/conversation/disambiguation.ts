import { MemoryItem } from "@/lib/memory/useMemoryStore";

// Clarifier without memory
export function disambiguate(userMsg: string, context: string): string | null {
  const msg = userMsg.toLowerCase();

  if (/spicy|hot/i.test(msg)) {
    return "Got it — do you mean more chili, or just extra seasoning?";
  }
  if (/pain/i.test(msg) && !/where|location|severity/.test(msg)) {
    return "Can you tell me where the pain is and how strong it feels?";
  }
  if (/reset|start over|fresh chat/.test(msg)) {
    return "Do you want me to clear context and begin a fresh chat?";
  }
  return null;
}

// Clarifier with memory
export function disambiguateWithMemory(
  userMsg: string,
  memories: MemoryItem[]
): string | null {
  return null;
}
