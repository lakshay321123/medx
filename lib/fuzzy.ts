// lib/fuzzy.ts
// Lightweight Damerau–Levenshtein distance (good for small dictionaries)
export function dlDistance(a: string, b: string): number {
  a = a.toLowerCase(); b = b.toLowerCase();
  const al = a.length, bl = b.length;
  const dp = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) dp[i][0] = i;
  for (let j = 0; j <= bl; j++) dp[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost); // transposition
      }
    }
  }
  return dp[al][bl];
}

export function bestFuzzyMatch(input: string, candidates: string[], maxDist = 2) {
  let best = { word: '', dist: Infinity };
  for (const c of candidates) {
    const d = dlDistance(input, c);
    if (d < best.dist) best = { word: c, dist: d };
    if (best.dist === 0) break;
  }
  return best.dist <= maxDist ? best.word : null;
}
