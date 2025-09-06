const MED_TERMS = [
  "leukemia",
  "lymphoma",
  "carcinoma",
  "sarcoma",
  "melanoma",
  "myeloma",
  "glioblastoma",
  "breast cancer",
  "lung cancer",
  "colon cancer",
  "aml",
  "all",
  "cml",
  "cll"
];

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  const alen = a.length;
  const blen = b.length;

  for (let i = 0; i <= alen; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= blen; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= alen; i++) {
    for (let j = 1; j <= blen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[alen][blen];
}

export function correctTopic(raw: string): string | null {
  const q = raw.toLowerCase().trim();
  let best: { term: string; score: number } | null = null;
  for (const t of MED_TERMS) {
    const d = levenshtein(q, t);
    const score = 1 - d / Math.max(q.length, t.length);
    if (!best || score > best.score) {
      best = { term: t, score };
    }
  }
  return best && best.score >= 0.72 ? best.term : null;
}
