import { rankResults } from "@/lib/research/ranking";
import { dedupeResults } from "@/lib/research/dedupe";
import { interpretTrialQuery } from "@/lib/research/queryInterpreter";
import { buildCtgovExpr, romanPhase } from "@/lib/research/ctgovQuery";
import { composeTrialsAnswer } from "@/lib/research/answerComposer";
import { searchCtgovByExpr } from "@/lib/research/sources/ctgov";
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
  content: string;
  citations: Citation[];
  followUps: string[];
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

  const tq = interpretTrialQuery(query);
  const expr = buildCtgovExpr({
    condition: tq.condition || tq.cancerType,
    keywords: tq.keywords,
    phase: tq.phase,
    recruiting: tq.recruiting ?? true,
    country: tq.country,
  });

  const [ctRes, pmRes, ctriRes, epmcRes, crossRes, oaRes, ictrpRes, drugRes] = await Promise.allSettled([
    searchCtgovByExpr(expr, { max: 75 }),
    searchPubMed(query),
    searchCtri(query),
    searchEuropePmc(query),
    searchCrossref(query),
    searchOpenAlex(query),
    searchIctrp(query),
    searchDrugSafety(query),
  ]);

  const ctgovTargeted = ctRes.status === "fulfilled" ? ctRes.value : [];
  const ctgovFiltered = ctgovTargeted.filter(t => {
    if (!tq.phase) return true;
    const p = (t.extra?.phase || "").toUpperCase();
    return p.includes(romanPhase(tq.phase!));
  });

  const ctri = ctriRes.status === "fulfilled" ? ctriRes.value : [];
  const ictrp = ictrpRes.status === "fulfilled" ? ictrpRes.value : [];

  const ctriFiltered = ctri.filter(t => !tq.phase || (t.extra?.phase || "").toUpperCase().includes(romanPhase(tq.phase!)));
  const ictrpFiltered = ictrp.filter(t => !tq.phase || (t.extra?.phase || "").toUpperCase().includes(romanPhase(tq.phase!)));

  const trials = [...ctgovFiltered, ...ctriFiltered, ...ictrpFiltered];

  const papers = [
    ...(pmRes.status === "fulfilled" ? pmRes.value : []),
    ...(epmcRes.status === "fulfilled" ? epmcRes.value : []),
    ...(crossRes.status === "fulfilled" ? crossRes.value : []),
    ...(oaRes.status === "fulfilled" ? oaRes.value : []),
  ];
  const safety = drugRes.status === "fulfilled" ? drugRes.value : [];

  let citations = dedupeResults([...trials, ...papers, ...safety]);
  citations = rankResults(citations, { topic: query });

  let followUps: string[] = [];
  let content: string;
  if (!trials.length) {
    const phaseStr = tq.phase ? `Phase ${tq.phase} ` : "";
    const condStr = tq.condition || tq.cancerType || "";
    const statusStr = tq.recruiting === false ? "" : "active ";
    content = `I didn't find ${statusStr}${phaseStr}${condStr} trials matching your filters.`.trim();
    followUps = ["Include completed trials", "Any phase", "Add countries: US, EU"];
  } else {
    content = composeTrialsAnswer(query, trials, papers);
  }

  const packet: ResearchPacket = {
    content,
    citations,
    followUps,
    meta: { widened: false, tookMs: Date.now() - t0 },
  };
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

