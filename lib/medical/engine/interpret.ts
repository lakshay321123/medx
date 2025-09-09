export function pfRatioNotes(r: number): string[] {
  if (r < 100) return ["severe ARDS"];
  if (r < 200) return ["moderate ARDS"];
  if (r < 300) return ["mild ARDS"];
  return [];
}

export function chadsVascNotes(s: number): string[] {
  if (s === 0) return ["low risk"];
  if (s === 1) return ["intermediate risk"];
  return ["high risk"];
}
