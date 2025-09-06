import { TrialRow } from "@/types/trials";

const CT_API = "https://clinicaltrials.gov/api/query/study_fields";
const FIELDS = [
  "NCTId","BriefTitle","Condition","InterventionName","OverallStatus","Phase",
  "StartDate","CompletionDate","StudyType","LeadSponsorName","LocationFacility",
  "LocationCity","LocationCountry","EligibilityCriteria","PrimaryOutcomeMeasure"
];

export function normalizeTrials(j:any): TrialRow[] {
  const studies = j?.StudyFieldsResponse?.StudyFields || [];
  return studies.map((s:any): TrialRow => {
    const id = s.NCTId?.[0] ?? "";
    return {
      id,
      title: s.BriefTitle?.[0] ?? "",
      conditions: s.Condition || [],
      interventions: s.InterventionName || [],
      status: s.OverallStatus?.[0] ?? "",
      phase: s.Phase?.[0] ?? "",
      start: s.StartDate?.[0],
      complete: s.CompletionDate?.[0],
      type: s.StudyType?.[0],
      sponsor: s.LeadSponsorName?.[0],
      site: s.LocationFacility?.[0],
      city: s.LocationCity?.[0],
      country: s.LocationCountry?.[0],
      eligibility: s.EligibilityCriteria?.[0],
      primaryOutcome: s.PrimaryOutcomeMeasure?.[0],
      url: id ? `https://clinicaltrials.gov/study/${id}` : ""
    };
  });
}

export async function fetchTrials({
  condition, country, city, status, phase, min=1, max=25
}: {
  condition: string; country?: string; city?: string; status?: string; phase?: string; min?: number; max?: number;
}): Promise<TrialRow[]> {
  const filters:string[] = [];
  if (condition) filters.push(`AREA[Condition]${JSON.stringify(condition)}`);
  if (country)   filters.push(`AND AREA[LocationCountry]${JSON.stringify(country)}`);
  if (city)      filters.push(`AND AREA[LocationCity]${JSON.stringify(city)}`);
  if (status)    filters.push(`AND AREA[OverallStatus](${status})`);
  if (phase)     filters.push(`AND AREA[Phase](${phase})`);
  const expr = filters.join(" ");
  const url = `${CT_API}?expr=${encodeURIComponent(expr)}&fields=${encodeURIComponent(FIELDS.join(","))}&min_rnk=${min}&max_rnk=${max}&fmt=json`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return [];
  const j = await r.json();
  return normalizeTrials(j);
}
