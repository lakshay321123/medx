// Simple topic detection for food/recipes; extend as needed.
const TOPIC_PATTERNS: RegExp[] = [
  /\b(butter chicken|murgh makhani)\b/i,
  /\b(chocolate chip cookies?|cookie recipe)\b/i,
  /\b(chicken wings?|buffalo wings?)\b/i,
  /\b(paneer tikka|tikka masala)\b/i,
  /\b(biryani|pulao)\b/i,
  /\b(pasta|spaghetti|lasagna)\b/i,
  /\b(salad|caesar salad)\b/i,
  /\b(soup|broth)\b/i,
  /\b(recipe for ([a-z][a-z\s-]+))\b/i,    // general "recipe for ___"
];

export function detectTopic(text: string): string | null {
  const msg = (text || "").toLowerCase();
  for (const rx of TOPIC_PATTERNS) {
    const m = msg.match(rx);
    if (m) return (m[1] || m[0]).toLowerCase().trim();
  }
  // fallback: "X recipe"
  const m2 = msg.match(/\b([a-z][a-z\s-]+)\s+recipe\b/i);
  return m2 ? m2[1].toLowerCase().trim() : null;
}

export function wantsNewTopic(text: string): boolean {
  const msg = (text || "").toLowerCase();
  return /\b(new (recipe|dish)|different (recipe|dish)|switch to|change to)\b/.test(msg);
}

// Build a topic from recent messages (latest wins)
export function inferTopicFromHistory(messages: Array<{ role: string; content: string }>): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const t = detectTopic(messages[i].content);
    if (t) return t;
  }
  return null;
}

// Very light drift detector: if output mentions a *different* well-known dish.
const DRIFT_WORDS = [
  "chicken wings", "buffalo wings", "pizza", "burger", "tacos", "ramen", "pancakes"
];

export function seemsOffTopic(output: string, lockedTopic: string): boolean {
  const out = (output || "").toLowerCase();
  if (!out.includes(lockedTopic)) {
    // If it includes a known different dish, treat as drift.
    if (DRIFT_WORDS.some(w => out.includes(w))) return true;
  }
  return false;
}

// If drift detected, prepend a corrective line to keep UX smooth.
export function rewriteToTopic(output: string, topic: string): string {
  const note = `Sticking with **${titleCase(topic)}** as requested. Adjusting the recipe accordingly.\n\n`;
  return note + output;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}
