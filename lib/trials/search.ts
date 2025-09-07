import { fetchTrials } from "@/lib/trials";
import type { TrialRow } from "@/types/trials";
import { Topic } from "../topic/normalize";

export type Trial = { title: string; condition?: string };

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

function geneMatch(r: TrialRow, genes: string[]): boolean {
  const hay = `${r.title} ${r.interventions?.join(" ") ?? ""}`.toLowerCase();
  return genes.every((g) => hay.includes(g.toLowerCase()));
}

export async function searchTrials(body: {
  query: string;
  phase?: string;
  status?: string;
  country?: string;
  genes?: string[];
}): Promise<TrialRow[]> {
  console.log("Searching trials with:", body);
  const { query, phase, status, country, genes } = body;
  if (!query) return [];
  const rows = await fetchTrials({ condition: query, phase, status, country, min: 1, max: 25 });
  return genes && genes.length ? rows.filter((t) => geneMatch(t, genes)) : rows;
}

