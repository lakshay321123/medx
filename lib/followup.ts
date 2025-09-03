export function isFollowUp(text: string): boolean {
  const q = text.trim().toLowerCase();
  if (!q) return false;
  const pats = [
    /\b(on|about|for|regarding)\s+(this|that|it|above|same)\b/,
    /\b(research (further|more)|dig deeper|elaborate|expand)\b/,
    /\b(latest\s+(trial|trials|studies|guidelines|evidence|research))\b/,
    /\b(what next|next steps|which doctor|who to see|medication for this)\b/,
    /\b(tell me about (it|this) again)\b/,
  ];
  return pats.some(r => r.test(q));
}
