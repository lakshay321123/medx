export const DOCTOR_JSON_SYSTEM = `
You are MedX Doctor Mode.
Return ONLY valid JSON matching this TypeScript type:
{
  "clinical_implications": string[],
  "management_options": string[],
  "supportive_palliative": string[],
  "red_flags": string[],
  "evidence"?: { title: string; url: string }[]
}
Rules:
- No trials, research, PubMed, registries, links, or references.
- No lifestyle/wellness tips.
- No headings, no markdown, no prose. JSON ONLY.
- Each array item must be a concise clinical bullet.
- If researchEnabled is true, include up to 6 compact sources in "evidence".
`;

const RESEARCH_RX = /\b(trial|trials|study|studies|research|pubmed|clinicaltrials\.gov|registry|NCI|ICTRP|WHO)\b/i;
const URL_RX = /https?:\/\/\S+/gi;

export function stripResearchFromBullets(arr: string[]): string[] {
  return (arr || [])
    .map(x => x.replace(URL_RX, "").trim())
    .filter(x => x && !RESEARCH_RX.test(x));
}

export function coerceDoctorJson(s: string) {
  try {
    const j = JSON.parse(s || "{}");
    return {
      clinical_implications: stripResearchFromBullets(j.clinical_implications || []),
      management_options: stripResearchFromBullets(j.management_options || []),
      supportive_palliative: stripResearchFromBullets(j.supportive_palliative || []),
      red_flags: stripResearchFromBullets(j.red_flags || []),
      evidence: Array.isArray(j.evidence)
        ? (j.evidence as any[])
            .slice(0, 6)
            .map((e) => ({ title: String(e.title || ""), url: String(e.url || "") }))
            .filter((e) => e.title && e.url)
        : undefined,
    };
  } catch {
    return {
      clinical_implications: [],
      management_options: [],
      supportive_palliative: [],
      red_flags: [],
      evidence: undefined,
    };
  }
}
