type Input = {
  query?: string;
  phase?: "1" | "2" | "3" | "4";
  status?:
    | "Recruiting"
    | "Completed"
    | "Active, not recruiting"
    | "Enrolling by invitation";
  country?: string;
  genes?: string[];
};

import { Topic } from "@/lib/topic/normalize";

export type Trial = {
  id: string;
  title: string;
  url: string;
  phase?: "1" | "2" | "3" | "4";
  status?:
    | "Recruiting"
    | "Completed"
    | "Active, not recruiting"
    | "Enrolling by invitation";
  country?: string;
  gene?: string;
};

function normalizePhase(p: any): "1" | "2" | "3" | "4" | undefined {
  const phase = String(p || "").toLowerCase();
  if (phase.includes("1")) return "1";
  if (phase.includes("2")) return "2";
  if (phase.includes("3")) return "3";
  if (phase.includes("4")) return "4";
  return undefined;
}

function normalizeStatus(
  s: any
):
  | "Recruiting"
  | "Completed"
  | "Active, not recruiting"
  | "Enrolling by invitation"
  | undefined {
  const status = String(s || "").toLowerCase();
  if (status.includes("active")) return "Active, not recruiting";
  if (status.includes("enrolling")) return "Enrolling by invitation";
  if (status.includes("recruit")) return "Recruiting";
  if (status.includes("complete")) return "Completed";
  return undefined;
}

export async function searchTrials(input: Input): Promise<Trial[]> {
  const results = await clinicalTrialsGovSearch(input);

  return results.map((r: any) => ({
    id: r.nctId || r.id,
    title: r.title,
    url: r.url,
    phase: normalizePhase(r.phase),
    status: normalizeStatus(r.status),
    country: r.country,
    gene: r.gene,
  }));
}

export function scoreTrialRelevance(t: Trial, topic: Topic): number {
  const title = (t.title || "").toLowerCase();
  let s = 0;
  if (title.includes(topic.canonical)) s += 2;
  if (topic.synonyms.some((k) => title.includes(k.toLowerCase()))) s += 2;
  if (topic.anatomy && title.includes(topic.anatomy)) s += 1;
  if (topic.excludes.some((re) => re.test(title))) s -= 2;
  return s;
}

export function filterTrials(trials: Trial[], topic: Topic): Trial[] {
  return trials.filter((t) => scoreTrialRelevance(t, topic) >= 2);
}

async function clinicalTrialsGovSearch(input: Input): Promise<any[]> {
  const terms: string[] = [];
  if (input.query) terms.push(input.query);
  if (input.genes?.length) terms.push(input.genes.join(" "));
  if (input.country) terms.push(`location:${input.country}`);
  if (input.phase) terms.push(`phase:${input.phase}`);
  if (input.status) terms.push(`status:${input.status}`);

  const q = encodeURIComponent(terms.join(" "));

  const url = `https://clinicaltrials.gov/api/v2/studies?format=json&query.term=${q}&pageSize=25`;
  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClinicalTrials.gov error ${res.status}: ${text}`);
  }

  const data = await res.json();

  const items = (data?.studies || []).map((s: any) => ({
    id: s.protocolSection?.identificationModule?.nctId,
    title: s.protocolSection?.identificationModule?.briefTitle,
    url: `https://clinicaltrials.gov/study/${s.protocolSection?.identificationModule?.nctId}`,
    phase: s.protocolSection?.designModule?.phases?.[0],
    status: s.protocolSection?.statusModule?.overallStatus,
    country: s.protocolSection?.contactsLocationsModule?.locations?.[0]?.country,
    gene: undefined,
  }));

  return items;
}

