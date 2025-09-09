export const ALIASES: Record<string, string[]> = {
  "non small cell lung cancer": ["nsclc", "non-small cell lung carcinoma"],
  "acute myeloid leukemia": ["aml"],
  "multiple myeloma": ["mm"],
  "colorectal cancer": ["crc", "colon cancer", "rectal cancer"],
  "hepatocellular carcinoma": ["hcc", "liver cancer"],
  "triple negative breast cancer": ["tnbc"],
};

export function expandQuery(q: string): string[] {
  const base = q.toLowerCase();
  const extras = new Set<string>();
  for (const [k, vals] of Object.entries(ALIASES)) {
    if (base.includes(k) || vals.some((v) => base.includes(v))) {
      extras.add(k);
      vals.forEach((v) => extras.add(v));
    }
  }
  return [q, ...Array.from(extras)];
}
