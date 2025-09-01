import { safeJson } from './safeJson';

export async function getTrials(query: string) {
  const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(query)}&pageSize=5`;
  const res = await fetch(url, { next: { revalidate: 300 }});
  if (!res.ok) throw new Error("ClinicalTrials.gov API error");
  return safeJson(res);
}
