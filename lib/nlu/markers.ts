import type { ConversationalAct } from "@/types/conversation";

const ACK_PATTERNS = [
  "nice", "great", "exactly", "perfect", "awesome", "cool",
  "thanks", "thank you", "good job", "well done", "works", "love it",
  "sweet", "sounds good", "looks good", "nailed it", "amazing"
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/\p{Extended_Pictographic}+/gu, "") // strip emojis
    .replace(/[^a-z0-9\s]/g, " ")               // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyAct(userText: string, lastTopic?: string): ConversationalAct {
  const n = normalize(userText);

  // Exact ack?
  if (ACK_PATTERNS.some(p => n === p || n.startsWith(p))) return "ack";

  // Short consent/confirmation
  if (/\b(ok|okay|cool|yep|yup|sure|done|great|perfect)\b/.test(n)) return "ack";

  // Heuristics: if very short and no verbs → likely ack
  if (n.split(" ").length <= 3 && !/\b(what|how|why|when|where|who|can|should|make|do)\b/.test(n)) {
    return "ack";
  }

  // If message references previous topic terms, treat as followup
  if (lastTopic && n.includes(normalize(lastTopic))) return "followup";

  // Default: new topic or clarify
  return /(\?$|^why|^how|^what|^can|^should)/.test(n) ? "clarify" : "new_topic";
}
