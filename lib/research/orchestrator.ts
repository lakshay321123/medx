import { rankResults } from "@/lib/research/ranking";
import { dedupeResults } from "@/lib/research/dedupe";
import { interpretTrialQuery, detectNewTopic } from "@/lib/research/queryInterpreter";
import { buildCtgovExpr } from "@/lib/research/ctgovQuery";
import { composeAnswer } from "@/lib/research/answerComposer";
import { searchCtgovByExpr } from "@/lib/research/sources/ctgov";
import { searchCtri } from "@/lib/research/sources/ctri";
import { searchPubMed } from "@/lib/research/sources/pubmed";
import { searchEuropePmc } from "@/lib/research/sources/eupmc";
import { searchCrossref } from "@/lib/research/sources/crossref";
import { searchOpenAlex } from "@/lib/research/sources/openalex";
import { searchIctrp } from "@/lib/research/sources/ictrp";
import { searchDailyMed } from "@/lib/research/sources/dailymed";
import { searchOpenFda } from "@/lib/research/sources/openfda";
import { fetchRxCui } from "@/lib/research/sources/rxnorm";
import { isTrial, hasRegistryId, matchesPhase, matchesStatus, matchesCountry, matchesGene } from "@/lib/research/validators";
import type { ResearchFilters } from "@/store/researchFilters";

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

let prevCondition: string | undefined;

export async function orchestrateResearch(query: string, opts: { mode: string; filters?: ResearchFilters }): Promise<ResearchPacket> {
  const now = Date.now();
  const cached = cache.get(query);
  if (cached && now - cached.ts < CACHE_MS) {
    return cached.data;
  }

  const t0 = now;

  const isNewTopic = detectNewTopic(query, prevCondition);

  if (isNewTopic) {
    prevCondition = undefined;
  }

  const tq = interpretTrialQuery(query);
  if (tq.condition) {
    prevCondition = tq.condition;
  }

  const f: ResearchFilters = { status: "recruiting", ...(opts.filters || {}) };
  if (!f.phase && tq.phase) f.phase = tq.phase;
  if (!f.country && tq.country) f.country = tq.country;
  if (!f.status && typeof tq.recruiting === "boolean") f.status = tq.recruiting ? "recruiting" : "any";
  if (f.status) f.status = f.status.toLowerCase();

  const expr = buildCtgovExpr({
    condition: tq.condition || tq.cancerType,
    keywords: tq.keywords,
    phase: f.phase,
    status: f.status,
    country: f.country,
    gene: f.gene,
  });

  const rx = await safe(() => fetchRxCui(query));

  const [ctRes, ctriRes, ictrpRes, pmRes, epmcRes, crossRes, oaRes, dmRes, fdaRes] = await Promise.allSettled([
    searchCtgovByExpr(expr, { max: 100 }),
    searchCtri(query),
    searchIctrp(query),
    searchPubMed(genedQuery(query, f.gene)),
    searchEuropePmc(genedQuery(query, f.gene)),
    searchCrossref(genedQuery(query, f.gene)),
    searchOpenAlex(genedQuery(query, f.gene)),
    rx ? searchDailyMed(rx) : Promise.resolve([]),
    searchOpenFda(query),
  ]);

  const ctgovTargeted = ctRes.status === "fulfilled" ? ctRes.value : [];
  const ctri = ctriRes.status === "fulfilled" ? ctriRes.value : [];
  const ictrp = ictrpRes.status === "fulfilled" ? ictrpRes.value : [];

  const allTrials = [
    ...ctgovTargeted,
    ...ctri,
    ...ictrp,
  ];

  const trials = allTrials
    .filter(isTrial)
    .filter(hasRegistryId)
    .filter(c => matchesPhase(c, f.phase))
    .filter(c => matchesStatus(c, f.status))
    .filter(c => matchesCountry(c, f.country))
    .filter(c => matchesGene(c, f.gene));

  const pubmed = pmRes.status === "fulfilled" ? pmRes.value : [];
  const eupmc = epmcRes.status === "fulfilled" ? epmcRes.value : [];
  const crossref = crossRes.status === "fulfilled" ? crossRes.value : [];
  const openalex = oaRes.status === "fulfilled" ? oaRes.value : [];
  const dailymed = dmRes.status === "fulfilled" ? dmRes.value : [];
  const openfda = fdaRes.status === "fulfilled" ? fdaRes.value : [];

  const papers = (pubmed || []).concat(eupmc || [], crossref || [], openalex || []).filter(p => matchesGene(p, f.gene));
  const safety = (dailymed || []).concat(openfda || []);

  let citations = dedupeResults([...trials, ...papers, ...safety]);
  citations = rankResults(citations, { topic: query });

  let content: string;
  let followUps: string[] = [];

  if (trials.length === 0) {
    content = `I couldn't find trials that match your filters.`;
    followUps = [
      "Include completed",
      "Any phase",
      "Add country: US/EU",
    ];
    if (opts.mode !== 'patient') followUps.push('Clear filters');
  } else {
    content = composeAnswer(query, trials, papers, opts, f);
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

function genedQuery(q: string, gene?: string) {
  return [q, gene].filter(Boolean).join(' ');
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

