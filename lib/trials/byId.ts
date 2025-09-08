import { TrialRow } from "@/types/trials";

const CT_FULL = "https://clinicaltrials.gov/api/query/study_fields";
const FIELDS = [
  "NCTId","BriefTitle","Condition","InterventionName","OverallStatus","Phase",
  "StudyType","LeadSponsorName","StudyFirstPostDate","LastUpdatePostDate",
  "LocationFacility","LocationCity","LocationCountry","EligibilityCriteria",
  "PrimaryOutcomeMeasure","StartDate","PrimaryCompletionDate","CompletionDate"
];

export function normalizeOneTrial(j:any): TrialRow | null {
  const s = j?.StudyFieldsResponse?.StudyFields?.[0];
  if (!s) return null;
  const id = s.NCTId?.[0] ?? "";
  return {
    id,
    title: s.BriefTitle?.[0] ?? "",
    conditions: s.Condition ?? [],
    interventions: s.InterventionName ?? [],
    status: s.OverallStatus?.[0] ?? "",
    phase: s.Phase?.[0]?.replace(/^phase\s*/i,"") ?? "",
    studyType: s.StudyType?.[0] ?? "",
    sponsor: s.LeadSponsorName?.[0] ?? "",
    locations: (s.LocationFacility ?? []).map((f:string, i:number) => ({
      facility: f,
      city: s.LocationCity?.[i] ?? "",
      country: s.LocationCountry?.[i] ?? "",
    })),
    startDate: s.StartDate?.[0] ?? "",
    completionDate: s.CompletionDate?.[0] ?? "",
    eligibility: s.EligibilityCriteria?.[0] ?? "",
    primaryOutcome: s.PrimaryOutcomeMeasure?.[0] ?? "",
    url: id ? `https://clinicaltrials.gov/study/${id}` : ""
  };
}

export async function fetchTrialByNct(nctId: string): Promise<TrialRow | null> {
  // AREA[NCTId]NCT06083415 is supported by study_fields
  const expr = `AREA[NCTId]${JSON.stringify(nctId)}`;
  const url = `${CT_FULL}?expr=${encodeURIComponent(expr)}&fields=${encodeURIComponent(FIELDS.join(","))}&min_rnk=1&max_rnk=1&fmt=json`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return null;
  const j = await r.json();
  return normalizeOneTrial(j);
}
