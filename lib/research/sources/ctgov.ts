import { fetchJson } from "@/lib/research/net";
import { normalizePhase } from "./utils";

export type Citation = {
  id: string;
  title: string;
  url: string;
  source: string;
  date?: string;
  extra?: any;
};

/**
 * Search ClinicalTrials.gov for trials by query.
 * Recruiting only by default; falls back to all if none found.
 */
export async function searchCtgov(query: string, opts?: { recruitingOnly?: boolean }): Promise<Citation[]> {
  const fields = ["NCTId","BriefTitle","OverallStatus","Phase","StudyFirstPostDate","LastUpdatePostDate"];
  const url = `https://clinicaltrials.gov/api/query/study_fields?expr=${encodeURIComponent(query)}&fields=${fields.join(",")}&min_rnk=1&max_rnk=75&fmt=json`;

  const data = await fetchJson(url).catch(() => null);
  if (!data?.StudyFieldsResponse?.StudyFields) return [];

  const rows = data.StudyFieldsResponse.StudyFields as any[];
  return rows.map(r => {
    const id = r.NCTId?.[0] || "";
    const title = r.BriefTitle?.[0] || "";
    const status = r.OverallStatus?.[0] || "";
    const phaseRaw = r.Phase?.[0] || "";
    const evidenceLevel = normalizePhase(phaseRaw);
    const date = r.LastUpdatePostDate?.[0] || r.StudyFirstPostDate?.[0] || "";

    return {
      id,
      title,
      url: id ? `https://clinicaltrials.gov/study/${id}` : "",
      source: "ctgov",
      date,
      extra: { status, recruiting: /recruiting/i.test(status), evidenceLevel }
    };
  }).filter(c => opts?.recruitingOnly ? c.extra?.recruiting : true);
}

export async function searchCtgovByExpr(expr: string, opts?: { max?: number }): Promise<Citation[]> {
  const fields = [
    "NCTId",
    "BriefTitle",
    "OverallStatus",
    "Phase",
    "StudyType",
    "StudyFirstPostDate",
    "LastUpdatePostDate",
    "LocationCountry",
  ];
  const url = `https://clinicaltrials.gov/api/query/study_fields?expr=${encodeURIComponent(expr)}&fields=${fields.join(",")}&min_rnk=1&max_rnk=${opts?.max ?? 100}&fmt=json`;
  const data = await fetchJson(url).catch(() => null);
  if (!data?.StudyFieldsResponse?.StudyFields) return [];
  return (data.StudyFieldsResponse.StudyFields as any[]).map(r => ({
    id: r.NCTId?.[0] || "",
    title: r.BriefTitle?.[0] || "",
    url: r.NCTId?.[0] ? `https://clinicaltrials.gov/study/${r.NCTId[0]}` : "",
    source: "ctgov",
    date: r.LastUpdatePostDate?.[0] || r.StudyFirstPostDate?.[0] || "",
    extra: {
      status: r.OverallStatus?.[0],
      phase: r.Phase?.[0],
      recruiting: /recruiting/i.test(r.OverallStatus?.[0] || ""),
      studyType: r.StudyType?.[0],
      country: r.LocationCountry?.[0],
      evidenceLevel: (r.Phase?.[0] || "").toUpperCase() || "Clinical Trial",
    },
  }));
}

