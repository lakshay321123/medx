import { MemoryItem } from "@/lib/memory/useMemoryStore";

export function disambiguate(userMsg: string, context: string): string | null {
  const msg = userMsg.toLowerCase();

  if (/spicy|hot/i.test(msg)) {
    return "Got it — do you mean more chili, or just extra seasoning?";
  }
  if (/expand|more/i.test(msg) && context.includes("recipe")) {
    return "Do you want me to add more steps, or suggest ingredient swaps?";
  }
  if (/pain/i.test(msg) && !/where|location|severity/.test(msg)) {
    return "Can you tell me where the pain is and how strong it feels?";
  }
  if (/allergy/i.test(msg) && context.includes("diet")) {
    return "Thanks for sharing — do you want me to suggest allergy-safe alternatives?";
  }
  return null;
}

export function disambiguateWithMemory(
  userMsg: string,
  memories: MemoryItem[]
): string | null {
  const msg = userMsg.toLowerCase();

  if (/recipe|diet/i.test(msg)) {
    const allergy = memories.find((m) => m.key === "allergy");
    if (allergy) {
      return `Noted your allergy to ${allergy.value.item}. Want me to suggest safe alternatives?`;
    }
  }
  return null;
}
