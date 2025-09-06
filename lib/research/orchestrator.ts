import { rankResults } from "@/lib/research/ranking";
import { dedupeResults } from "@/lib/research/dedupe";
import { searchCtgov } from "@/lib/research/sources/ctgov";
import { searchCtri } from "@/lib/research/sources/ctri";
import { searchPubMed } from "@/lib/research/sources/pubmed";
import { searchEuropePmc } from "@/lib/research/sources/eupmc";
import { searchCrossref } from "@/lib/research/sources/crossref";
import { searchOpenAlex } from "@/lib/research/sources/openalex";
import { searchIctrp } from "@/lib/research/sources/ictrp";
import { searchDrugSafety } from "@/lib/research/sources/drugSafety";

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

const cache = new Map<string, { ts: number; data: ResearchPacket }>();
const CACHE_MS = 5 * 60 * 1000;

export async function orchestrateResearch(query: string): Promise<ResearchPacket> {
  const now = Date.now();
  const cached = cache.get(query);
  if (cached && now - cached.ts < CACHE_MS) {
    return cached.data;
  }

  const t0 = now;

  const [ctRes, pmRes, ctriRes, epmcRes, crossRes, oaRes, ictrpRes, drugRes] = await Promise.allSettled([
    searchCtgov(query, { recruitingOnly: true }),
    searchPubMed(query),
    searchCtri(query),
    searchEuropePmc(query),
    searchCrossref(query),
    searchOpenAlex(query),
    searchIctrp(query),
    searchDrugSafety(query),
  ]);

  let trials = ctRes.status === "fulfilled" ? ctRes.value : [];
  if (!trials.length) {
    const ctAll = await safe(() => searchCtgov(query, { recruitingOnly: false }));
    trials = ctAll || [];
  }

  const ctri = ctriRes.status === "fulfilled" ? ctriRes.value : [];
  const ictrp = ictrpRes.status === "fulfilled" ? ictrpRes.value : [];
  const papers = [
    ...(pmRes.status === "fulfilled" ? pmRes.value : []),
    ...(epmcRes.status === "fulfilled" ? epmcRes.value : []),
    ...(crossRes.status === "fulfilled" ? crossRes.value : []),
    ...(oaRes.status === "fulfilled" ? oaRes.value : []),
  ];
  const safety = drugRes.status === "fulfilled" ? drugRes.value : [];

  let citations = dedupeResults([...trials, ...ctri, ...ictrp, ...papers, ...safety]);
  citations = rankResults(citations, { topic: query });

  const packet = { topic: query, citations, meta: { widened: !trials.length, tookMs: Date.now() - t0 } };
  cache.set(query, { ts: now, data: packet });
  return packet;
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

