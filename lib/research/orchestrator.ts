import { rankResults } from "@/lib/research/ranking";
import { dedupeResults } from "@/lib/research/dedupe";
import { interpretTrialQuery, detectNewTopic } from "@/lib/research/queryInterpreter";
import { buildCtgovExpr } from "@/lib/research/ctgovQuery";
import { composeAnswer } from "@/lib/research/answerComposer";
import { searchCtgovByExpr } from "@/lib/research/sources/ctgov";
import { searchCtri, searchCTRI } from "@/lib/research/sources/ctri";
import { searchNCT } from "@/lib/research/sources/nct";
import type { TrialRecord } from "@/types/research";
import { FEATURES } from "@/lib/config";
import { searchPubMed } from "@/lib/research/sources/pubmed";
import { searchEuropePmc } from "@/lib/research/sources/eupmc";
import { searchCrossref } from "@/lib/research/sources/crossref";
import { searchOpenAlex } from "@/lib/research/sources/openalex";
import { searchIctrp } from "@/lib/research/sources/ictrp";
import { searchDailyMed } from "@/lib/research/sources/dailymed";
import { searchOpenFda } from "@/lib/research/sources/openfda";
import { fetchRxCui } from "@/lib/research/sources/rxnorm";
import { isTrial, hasRegistryId, matchesPhase, matchesStatus, matchesCountries, matchesGenes } from "@/lib/research/validators";
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
  if ((!f.countries || f.countries.length === 0) && tq.country) f.countries = [tq.country];
  if (!f.status && typeof tq.recruiting === "boolean") f.status = tq.recruiting ? "recruiting" : "any";

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

// ---- Trials orchestration (registry-agnostic) -------------------------

const INDIA_HINTS = [
  " india ", " in india", "indian", " bharat ", " भारत ",
  "delhi", "new delhi", "mumbai", "bombay", "bengaluru", "bangalore", "chennai",
  "kolkata", "calcutta", "hyderabad", "pune", "ahmedabad", "gurgaon", "noida", "kochi",
  "jaipur", "lucknow", "chandigarh", "indore", "bhopal", "surat", "nagpur", "goa",
];

function mentionsIndia(q: string) {
  const s = ` ${q.toLowerCase()} `;
  return INDIA_HINTS.some((h) => s.includes(h));
}

function normalizePhase(p?: string) {
  if (!p) return undefined;
  const s = p.toLowerCase();
  if (s.includes("i") && s.includes("ii") && !s.includes("iii")) return "Phase I/II";
  if (s.includes("ii") && s.includes("iii")) return "Phase II/III";
  if (s.includes("iii")) return "Phase III";
  if (s.includes("iv")) return "Phase IV";
  if (s.includes("ii")) return "Phase II";
  if (s.includes("i")) return "Phase I";
  return p;
}

function keyForTrial(t: TrialRecord) {
  const title = (t.title || "").toLowerCase().replace(/\W+/g, " ").trim();
  const mon = (t.when?.registered || t.when?.updated || "").slice(0, 7);
  const loc = (t.locations || []).join(",").toLowerCase().replace(/\W+/g, " ").slice(0, 80);
  return `${title}|${mon}|${loc}`;
}

function dedupeTrials(items: TrialRecord[]) {
  if (!FEATURES.TRIALS_DEDUPE) return items;
  const seen = new Map<string, TrialRecord>();
  for (const t of items) {
    const k = keyForTrial(t);
    if (!seen.has(k)) seen.set(k, t);
  }
  return Array.from(seen.values());
}

export async function orchestrateTrials(query: string, opts?: { country?: string }) {
  const includeCTRI =
    opts?.country?.toLowerCase() === "india" ||
    (FEATURES.TRIALS_GEO_ROUTING && mentionsIndia(query));

  const tasks: Promise<TrialRecord[]>[] = [searchNCT(query).catch(() => [])];
  if (includeCTRI) tasks.push(searchCTRI(query).catch(() => []));

  const batches = await Promise.all(tasks);
  const merged = dedupeTrials(
    batches
      .flat()
      .map((t) => ({
        ...t,
        phase: FEATURES.TRIALS_PHASE_NORMALIZE ? normalizePhase(t.phase) : t.phase,
      }))
  );

  const order = (r: string) =>
    includeCTRI ? (r === "CTRI" ? 0 : r === "NCT" ? 1 : 2) : r === "NCT" ? 0 : r === "CTRI" ? 1 : 2;

  return merged.sort((a, b) => order(a.registry) - order(b.registry));
}

