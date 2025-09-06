import { rankResults } from "@/lib/research/ranking";
import { dedupeResults } from "@/lib/research/dedupe";
import { searchCtgov } from "@/lib/research/sources/ctgov";
import { searchCtri } from "@/lib/research/sources/ctri";
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

  const [ctRes, pmRes, ctriRes] = await Promise.allSettled([
    searchCtgov(query, { recruitingOnly: true }),
    searchPubMed(query),
    searchCtri(query),
  ]);

  let trials = ctRes.status === "fulfilled" ? ctRes.value : [];
  if (!trials.length) {
    const ctAll = await safe(() => searchCtgov(query, { recruitingOnly: false }));
    trials = ctAll || [];
  }

  const ctri = ctriRes.status === "fulfilled" ? ctriRes.value : [];
  const papers = pmRes.status === "fulfilled" ? pmRes.value : [];

  let citations = dedupeResults([...trials, ...ctri, ...papers]);
  citations = rankResults(citations, { topic: query });

  return { topic: query, citations, meta: { widened: !trials.length, tookMs: Date.now() - t0 } };
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}
