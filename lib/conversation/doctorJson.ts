import { BRAND_NAME } from "@/lib/brand";

export const DOCTOR_JSON_SYSTEM = `
You are ${BRAND_NAME} Clinical Mode.
Return ONLY valid JSON matching this TypeScript type:
{
  "clinical_implications": string[],
  "management_options": string[],
  "supportive_palliative": string[],
  "red_flags": string[]
}
Rules:
- No trials, research, PubMed, registries, links, or references.
- No lifestyle/wellness tips.
- No headings, no markdown, no prose. JSON ONLY.
- Each array item must be a concise clinical bullet.
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
    };
  } catch {
    return {
      clinical_implications: [],
      management_options: [],
      supportive_palliative: [],
      red_flags: [],
    };
  }
}
