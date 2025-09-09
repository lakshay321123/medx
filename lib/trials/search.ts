// Add a Phase type that includes mixed values
import { fetchEUCTR } from "./fetchEUCTR";
import { fetchCTRI } from "./fetchCTRI";
import { fetchISRCTNRecord } from "./fetchISRCTN";

type PhaseStr = "1" | "2" | "3" | "4" | "1/2" | "2/3";

type Input = {
  query?: string;
  phase?: "1" | "2" | "3" | "4"; // user selects a single anchor phase
  // allow comma-separated statuses (e.g., "Recruiting,Enrolling by invitation")
  status?: string;
  country?: string;
  genes?: string[];
};

type TrialStatus =
  | "Recruiting"
  | "Completed"
  | "Active, not recruiting"
  | "Enrolling by invitation"
  | "Not yet recruiting";

export type Trial = {
  id: string;
  title: string;
  url: string;
  phase?: PhaseStr; // <-- now can be "1/2" or "2/3"
  status?: TrialStatus;
  country?: string;
  gene?: string;
  source?: "CTgov" | "EUCTR" | "CTRI" | "ISRCTN";
};

const INDIA_HINTS = [
  " india ", " in india", "indian", " bharat ", " भारत ",
  "delhi","mumbai","bombay","bengaluru","bangalore","chennai","kolkata",
  "hyderabad","pune","ahmedabad","gurgaon","noida","kochi","jaipur","lucknow"
];

function mentionsIndia(q: string) {
  const s = ` ${q.toLowerCase()} `;
  return INDIA_HINTS.some(h => s.includes(h));
}

// ---- helpers --------------------------------------------------

function normalizePhase(raw?: string): PhaseStr | undefined {
  if (!raw) return undefined;
  const s = String(raw).toLowerCase().replace(/\s+/g, " ").trim();

  // Mixed phases first
  if (s.includes("phase 1/phase 2") || s.includes("phase 1 / phase 2") || s.includes("phase1/phase2")) return "1/2";
  if (s.includes("phase 2/phase 3") || s.includes("phase 2 / phase 3") || s.includes("phase2/phase3")) return "2/3";

  // Common variants
  if (s.includes("early phase 1")) return "1";
  if (s.includes("phase 1")) return "1";
  if (s.includes("phase 2")) return "2";
  if (s.includes("phase 3")) return "3";
  if (s.includes("phase 4")) return "4";

  const onlyNum = s.replace(/[^\d/]/g, "");
  if (onlyNum === "1/2" || onlyNum === "2/3") return onlyNum as PhaseStr;
  if (onlyNum === "1" || onlyNum === "2" || onlyNum === "3" || onlyNum === "4") return onlyNum as PhaseStr;

  return undefined;
}

function normalizeStatus(raw?: string):
  | "Recruiting"
  | "Completed"
  | "Active, not recruiting"
  | "Enrolling by invitation"
  | "Not yet recruiting"
  | undefined {
  if (!raw) return undefined;
  const s = String(raw).toLowerCase();
  if (s.startsWith("recruit")) return "Recruiting";
  if (s.startsWith("complete")) return "Completed";
  if (s.startsWith("active")) return "Active, not recruiting";
  if (s.startsWith("enrolling")) return "Enrolling by invitation";
  if (s.startsWith("not yet")) return "Not yet recruiting";
  if (
    raw === "Recruiting" ||
    raw === "Completed" ||
    raw === "Active, not recruiting" ||
    raw === "Enrolling by invitation" ||
    raw === "Not yet recruiting"
  )
    return raw as any;
  return undefined;
}

function normalizePhaseLoose(raw?: string): "1"|"2"|"3"|"4"|"1/2"|"2/3"|undefined {
  if (!raw) return undefined;
  const s = String(raw).toLowerCase();
  if (s.includes("1/2")) return "1/2";
  if (s.includes("2/3")) return "2/3";
  if (s.includes("phase 1") || /\bphase?\s*1\b/.test(s)) return "1";
  if (s.includes("phase 2") || /\bphase?\s*2\b/.test(s)) return "2";
  if (s.includes("phase 3") || /\bphase?\s*3\b/.test(s)) return "3";
  if (s.includes("phase 4") || /\bphase?\s*4\b/.test(s)) return "4";
  return normalizePhase(raw);
}

function normalizeStatusLoose(raw?: string):
  "Recruiting"|"Completed"|"Active, not recruiting"|"Enrolling by invitation"|"Not yet recruiting"|undefined {
  if (!raw) return undefined;
  const s = String(raw).toLowerCase();
  if (s.includes("recruit")) return "Recruiting";
  if (s.includes("complete") || s.includes("completed")) return "Completed";
  if (s.includes("active")) return "Active, not recruiting";
  if (s.includes("invite")) return "Enrolling by invitation";
  if (s.includes("not yet")) return "Not yet recruiting";
  return normalizeStatus(raw);
}

function containsAny(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some(n => h.includes(n.toLowerCase()));
}

export function dedupeTrials(arr: Trial[]) {
  const seen = new Set<string>();
  const out: Trial[] = [];
  for (const t of arr) {
    const key = `${(t.source || "").toUpperCase()}:${t.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export function rankValue(t: { status?: string; phase?: string; source?: string }) {
  const s = (t.status || "").toLowerCase();
  const p = (t.phase || "").replace(/[^0-9/]/g, "");
  const phaseTop = p.includes("4") ? 4 : p.includes("3") ? 3 : p.includes("2") ? 2 : p.includes("1") ? 1 : 0;

  const statusScore =
    s.startsWith("recruit") ? 3 :
    s.includes("enroll") ? 2 :
    s.startsWith("active") ? 1 : 0;

  const sourceScore = t.source === "CTgov" ? 1 : 0; // tie-breaker

  return statusScore * 100 + phaseTop * 10 + sourceScore;
}

// When user selects a single phase (e.g., "2"), include mixed "1/2" or "2/3" that contain it.
function phaseMatches(want: Input["phase"], trialPhase?: PhaseStr): boolean {
  if (!want) return true;           // no filter
  if (!trialPhase) return false;
  if (trialPhase === want) return true;
  if (trialPhase.includes("/")) {
    return trialPhase.split("/").includes(want); // e.g., "2/3".split("/") includes "2"
  }
  return false;
}

// ---- main search --------------------------------------------------

export async function searchTrials(input: Input): Promise<Trial[]> {
  const includeCTRI =
    (input.country && input.country.toLowerCase() === "india") ||
    mentionsIndia(input.query || "");

  // 1) fetch from sources in parallel
  const tasks: Promise<any[]>[] = [
    clinicalTrialsGovFetch({ query: input.query, genes: input.genes }),
    fetchEUCTR(input.query),
  ];
  if (includeCTRI) tasks.push(fetchCTRI(input.query));
  const settled = await Promise.allSettled(tasks);

  const fromCT =
    settled[0].status === "fulfilled"
      ? (settled[0].value as any[]).map(r => ({ ...r, source: "CTgov" as const }))
      : [];
  const fromEU = settled[1].status === "fulfilled" ? (settled[1].value as any[]) : [];
  const fromIN = includeCTRI && settled[2] && settled[2].status === "fulfilled" ? (settled[2].value as any[]) : [];

  // 2) merge
  const merged = [...fromCT, ...fromEU, ...fromIN];

  // 3) optional ISRCTN enrichment skipped

  // 4) normalize + filter (reuse your existing filters)
  const wantPhase = input.phase;
  const wantStatuses = (input.status || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const wantCountry = input.country?.toLowerCase();
  const wantGenes = (input.genes || []).map(g => g.trim()).filter(Boolean);

  const filtered = merged.filter((r: any) => {
    const p = normalizePhaseLoose(r.phase);
    const st = normalizeStatusLoose(r.status);
    const ctry = (r.country || "").toLowerCase();
    const title = r.title || "";

    if (!phaseMatches(wantPhase, p)) return false;
    if (wantStatuses.length && (!st || !wantStatuses.includes(st))) return false;
    if (wantCountry && ctry && ctry !== wantCountry) return false;
    if (wantGenes.length && !containsAny(title, wantGenes)) return false;

    return true;
  });

  // 5) map to Trial shape
  const mapped = filtered.map((r: any) => ({
    id: r.nctId || r.id,
    title: r.title,
    url: r.url,
    phase: normalizePhaseLoose(r.phase),
    status: normalizeStatusLoose(r.status),
    country: r.country,
    gene: r.gene,
    source: r.source,
  }));

  const order = (r: string) =>
    includeCTRI ? (r === "CTRI" ? 0 : r === "CTgov" ? 1 : 2) : 0;

  const out = dedupeTrials(mapped).sort((a, b) => {
    const o = order(a.source || "") - order(b.source || "");
    if (o !== 0) return o;
    return rankValue(b) - rankValue(a);
  });
  return out;
}

// ---- CT.gov fetch (unchanged except kept minimal) ---------------

async function clinicalTrialsGovFetch(input: { query?: string; genes?: string[] }): Promise<any[]> {
  const terms: string[] = [];
  if (input.query) terms.push(input.query);
  if (input.genes?.length) terms.push(input.genes.join(" "));
  const q = encodeURIComponent(terms.join(" ").trim());

  const url = `https://clinicaltrials.gov/api/v2/studies?format=json&query.term=${q}&pageSize=25`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`ClinicalTrials.gov error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  return (data?.studies || []).map((s: any) => ({
    id: s.protocolSection?.identificationModule?.nctId,
    title: s.protocolSection?.identificationModule?.briefTitle,
    url: `https://clinicaltrials.gov/study/${s.protocolSection?.identificationModule?.nctId}`,
    phase: s.protocolSection?.designModule?.phases?.[0],               // raw string like "Phase 2/Phase 3"
    status: s.protocolSection?.statusModule?.overallStatus,
    country: s.protocolSection?.contactsLocationsModule?.locations?.[0]?.country,
    gene: undefined,
  }));
}
