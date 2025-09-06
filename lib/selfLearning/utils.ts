export function cosineSimilarity(a: string, b: string): number {
  const tokenize = (s: string) => s.toLowerCase().split(/\W+/).filter(Boolean);
  const freq = (tokens: string[]) => {
    const m = new Map<string, number>();
    tokens.forEach(t => m.set(t, (m.get(t) || 0) + 1));
    return m;
  };
  const aFreq = freq(tokenize(a));
  const bFreq = freq(tokenize(b));
  let dot = 0;
  for (const [k, v] of aFreq) {
    const bv = bFreq.get(k);
    if (bv) dot += v * bv;
  }
  const mag = (m: Map<string, number>) =>
    Math.sqrt(Array.from(m.values()).reduce((s, v) => s + v * v, 0));
  const denom = mag(aFreq) * mag(bFreq);
  return denom ? dot / denom : 0;
}

export function keywordMatchScore(a: string, b: string): number {
  const keywords = ["diagnosis", "treatment", "symptom", "patient", "doctor"];
  const count = (s: string) =>
    keywords.filter(k => s.toLowerCase().includes(k)).length;
  const total = keywords.length * 2;
  return total ? (count(a) + count(b)) / total : 0;
}

export function toneAnalysisScore(s: string): number {
  const empathetic = ["understand", "sorry", "concern", "care", "support"];
  const lower = s.toLowerCase();
  const count = empathetic.filter(w => lower.includes(w)).length;
  return empathetic.length ? count / empathetic.length : 0;
}
