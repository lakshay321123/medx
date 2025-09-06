import { fetchJson } from "@/lib/research/net";
import { rankResults } from "@/lib/research/ranking";
import { dedupeResults } from "@/lib/research/dedupe";

export type Citation = {
  id: string;
  title: string;
  url: string;
  source: string;
  date?: string;
  extra?: any;
};

export type ResearchPacket = {
  topic: string;
  citations: Citation[];
  meta: { widened?: boolean; tookMs: number; sourcesHit: string[] };
};

export async function orchestrateResearch(query: string, opts?: { country?: string; phase?: string }) {
  const t0 = Date.now();
  const sourcesHit: string[] = [];

  const [ctgov, ctri, pubmed] = await Promise.allSettled([
    searchCtgov(query),
    searchCtri(query, opts?.country ?? "IN"),
    searchPubMed(query),
  ]);

  const results = collectOk([ctgov, ctri, pubmed]);
  let citations = dedupeResults(results);
  citations = rankResults(citations, { topic: query });

  return {
    topic: query,
    citations,
    meta: { widened: results.length === 0, tookMs: Date.now() - t0, sourcesHit },
  };
}

function collectOk(arr: PromiseSettledResult<any>[]) {
  return arr.filter(a => a.status === "fulfilled").flatMap((a: any) => a.value ?? []);
}

// Stub searchers (fill in later)
async function searchCtgov(q: string) { return []; }
async function searchCtri(q: string, country: string) { return []; }
async function searchPubMed(q: string) { return []; }
