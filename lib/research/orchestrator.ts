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
import { isTrial, hasRegistryId, matchesPhase, matchesStatus, matchesCountries, matchesGenes } from "@/lib/research/validators";

export type ResearchFilters = {
  phase?: "1" | "2" | "3" | "4";
  status?: "recruiting" | "active" | "completed";
  countries?: string[];
  genes?: string[];
};

export type TrialsResult = {
  trials: Array<{
    title: string;
    url: string;
    registryId?: string;
    extra?: {
      phase?: string;
      status?: string;
      condition?: string;
      intervention?: string;
      country?: string;
      genes?: string[];
      source?: "CTGov" | "CTRI" | "ICTRP";
    };
  }>;
  papers: Array<{
    title: string;
    url: string;
    source: "PubMed" | "EuropePMC" | "Crossref" | "OpenAlex";
  }>;
};

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
  if ((!f.countries || f.countries.length === 0) && tq.country) f.countries = [tq.country];
  if (!f.status && typeof tq.recruiting === "boolean") f.status = tq.recruiting ? "recruiting" : undefined;

  const expr = buildCtgovExpr({
    condition: tq.condition || tq.cancerType,
    keywords: tq.keywords,
    phase: f.phase,
    status: f.status,
    countries: f.countries,
    genes: f.genes,
  });

  const rx = await safe(() => fetchRxCui(query));

  const [ctRes, ctriRes, ictrpRes, pmRes, epmcRes, crossRes, oaRes, dmRes, fdaRes] = await Promise.allSettled([
    searchCtgovByExpr(expr, { max: 100 }),
    searchCtri(query),
    searchIctrp(query),
    searchPubMed(genedQuery(query, f.genes)),
    searchEuropePmc(genedQuery(query, f.genes)),
    searchCrossref(genedQuery(query, f.genes)),
    searchOpenAlex(genedQuery(query, f.genes)),
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
    .filter(c => matchesCountries(c, f.countries))
    .filter(c => matchesGenes(c, f.genes));

  const pubmed = pmRes.status === "fulfilled" ? pmRes.value : [];
  const eupmc = epmcRes.status === "fulfilled" ? epmcRes.value : [];
  const crossref = crossRes.status === "fulfilled" ? crossRes.value : [];
  const openalex = oaRes.status === "fulfilled" ? oaRes.value : [];
  const dailymed = dmRes.status === "fulfilled" ? dmRes.value : [];
  const openfda = fdaRes.status === "fulfilled" ? fdaRes.value : [];

  const papers = (pubmed || []).concat(eupmc || [], crossref || [], openalex || []).filter(p => matchesGenes(p, f.genes));
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
      "Add countries: US/EU",
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

export async function orchestrateTrials(
  userQuery: string,
  filters: ResearchFilters,
  opts: { mode: "patient" | "doctor" | "research"; researchOn: boolean }
): Promise<TrialsResult> {
  const tq = interpretTrialQuery(userQuery);
  const f: ResearchFilters = { ...(filters || {}) };
  if (!f.phase && tq.phase) f.phase = tq.phase;
  if ((!f.countries || f.countries.length === 0) && tq.country) f.countries = [tq.country];
  if (!f.status && typeof tq.recruiting === "boolean") f.status = tq.recruiting ? "recruiting" : "active";

  const expr = buildCtgovExpr({
    condition: tq.condition || tq.cancerType,
    keywords: tq.keywords,
    phase: f.phase,
    status: f.status,
    countries: f.countries,
    genes: f.genes,
  });

  const [ctRes, ctriRes, ictrpRes, pmRes, epmcRes, crossRes, oaRes] = await Promise.allSettled([
    searchCtgovByExpr(expr, { max: 100 }),
    searchCtri(userQuery),
    searchIctrp(userQuery),
    searchPubMed(genedQuery(userQuery, f.genes)),
    searchEuropePmc(genedQuery(userQuery, f.genes)),
    searchCrossref(genedQuery(userQuery, f.genes)),
    searchOpenAlex(genedQuery(userQuery, f.genes)),
  ]);

  const ctgovTargeted = ctRes.status === "fulfilled" ? ctRes.value : [];
  const ctri = ctriRes.status === "fulfilled" ? ctriRes.value : [];
  const ictrp = ictrpRes.status === "fulfilled" ? ictrpRes.value : [];

  const trials = [...ctgovTargeted, ...ctri, ...ictrp]
    .filter(isTrial)
    .filter(hasRegistryId)
    .filter((c) => matchesPhase(c, f.phase))
    .filter((c) => matchesStatus(c, f.status))
    .filter((c) => matchesCountries(c, f.countries))
    .filter((c) => matchesGenes(c, f.genes));

  const pubmed = pmRes.status === "fulfilled" ? pmRes.value : [];
  const eupmc = epmcRes.status === "fulfilled" ? epmcRes.value : [];
  const crossref = crossRes.status === "fulfilled" ? crossRes.value : [];
  const openalex = oaRes.status === "fulfilled" ? oaRes.value : [];

  const papers = (pubmed || [])
    .concat(eupmc || [], crossref || [], openalex || [])
    .filter((p) => matchesGenes(p, f.genes));

  return { trials, papers: papers as TrialsResult["papers"] };
}

function genedQuery(q: string, genes?: string[]) {
  return [q, ...(genes || [])].filter(Boolean).join(' ');
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

