export type Topic = { canonical: string; anatomy?: string; synonyms: string[]; excludes: RegExp[] };

export function normalizeTopic(raw: string): Topic {
  const m = raw.toLowerCase();
  // slip disc → intervertebral disc herniation
  const slip = /\b(slipp?ed?\s*disc|slip\s*disk|prolapsed\s*disc|disc\s*prolapse|herniated\s*(disc|disk)|hnp|radiculopathy)\b/;
  if (slip.test(m)) {
    return {
      canonical: "intervertebral disc herniation",
      anatomy: /cerv/i.test(m) ? "cervical" : /lumbar|sciatica/i.test(m) ? "lumbar" : undefined,
      synonyms: [
        "herniated disc",
        "disc herniation",
        "prolapsed intervertebral disc",
        "disc prolapse",
        "HNP",
        "lumbar radiculopathy",
        "cervical radiculopathy",
      ],
      excludes: [/hip|arthroplasty|femoral|shoulder|retina|hepatic|liver|prostate/i],
    };
  }
  // add more conditions here...
  return { canonical: raw.trim(), synonyms: [raw.trim()], excludes: [] };
}
