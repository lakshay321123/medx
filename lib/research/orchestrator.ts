import { rankResults } from "@/lib/research/ranking";
import { dedupeResults } from "@/lib/research/dedupe";
import { searchCtgov } from "@/lib/research/sources/ctgov";
import { searchPubMed } from "@/lib/research/sources/pubmed";

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
  meta: { widened?: boolean; tookMs: number };
};

export async function orchestrateResearch(query: string): Promise<ResearchPacket> {
  const t0 = Date.now();

  const [ctRes, pmRes] = await Promise.allSettled([
    searchCtgov(query, { recruitingOnly: true }),
    searchPubMed(query),
  ]);

  let trials = ctRes.status === "fulfilled" ? ctRes.value : [];
  if (!trials.length) {
    const ctAll = await searchCtgov(query, { recruitingOnly: false }).catch(() => []);
    trials = ctAll || [];
  }

  const papers = pmRes.status === "fulfilled" ? pmRes.value : [];

  let citations = dedupeResults([...trials, ...papers]);
  citations = rankResults(citations, { topic: query });

  return { topic: query, citations, meta: { widened: !trials.length, tookMs: Date.now() - t0 } };
}
