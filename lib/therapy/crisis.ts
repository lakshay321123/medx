const CRISIS_PATTERNS = [
  /\b(i\s*(want|plan|going)\s*to\s*(kill|hurt)\s*myself)\b/i,
  /\b(suicid(al|e)|end\s*my\s*life|no\s*reason\s*to\s*live)\b/i,
  /\b(hurt\s*others|kill\s*someone)\b/i
];

export function crisisCheck(text: string) {
  if (!text) return false;
  return CRISIS_PATTERNS.some((re) => re.test(text));
}
