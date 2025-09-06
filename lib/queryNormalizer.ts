export function normalizeQuery(q: string): string {
  const m = q.trim().toLowerCase();
  const map: Record<string, string> = {
    nsclc: 'non-small cell lung cancer',
    sclc: 'small cell lung cancer',
    tnbc: 'triple negative breast cancer',
    hcc: 'hepatocellular carcinoma',
  };
  return map[m] || q;
}
