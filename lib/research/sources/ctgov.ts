import { fetchJson } from "@/lib/research/net";

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
  const fields = ["NCTId","BriefTitle","OverallStatus","StudyFirstPostDate","LastUpdatePostDate"];
  const url = `https://clinicaltrials.gov/api/query/study_fields?expr=${encodeURIComponent(query)}&fields=${fields.join(",")}&min_rnk=1&max_rnk=75&fmt=json`;

  const data = await fetchJson(url).catch(() => null);
  if (!data?.StudyFieldsResponse?.StudyFields) return [];

  const rows = data.StudyFieldsResponse.StudyFields as any[];
  return rows.map(r => {
    const id = r.NCTId?.[0] || "";
    const title = r.BriefTitle?.[0] || "";
    const status = r.OverallStatus?.[0] || "";
    const date = r.LastUpdatePostDate?.[0] || r.StudyFirstPostDate?.[0] || "";

    return {
      id,
      title,
      url: id ? `https://clinicaltrials.gov/study/${id}` : "",
      source: "ctgov",
      date,
      extra: { status, recruiting: /recruiting/i.test(status) }
    };
  }).filter(c => opts?.recruitingOnly ? c.extra?.recruiting : true);
}

