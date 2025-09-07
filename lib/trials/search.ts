// Add a Phase type that includes mixed values
import { fetchEUCTR } from "./fetchEUCTR";
import { fetchCTRI } from "./fetchCTRI";
import { fetchISRCTNRecord } from "./fetchISRCTN";

type PhaseStr = "1" | "2" | "3" | "4" | "1/2" | "2/3";

type Input = {
  query?: string;
  phase?: "1" | "2" | "3" | "4"; // user selects a single anchor phase
  status?: "Recruiting" | "Completed" | "Active, not recruiting" | "Enrolling by invitation";
  country?: string;
  genes?: string[];
};

export type Trial = {
  id: string;
  title: string;
  url: string;
  phase?: PhaseStr; // <-- now can be "1/2" or "2/3"
  status?: "Recruiting" | "Completed" | "Active, not recruiting" | "Enrolling by invitation";
  country?: string;
  gene?: string;
  source?: "CTgov" | "EUCTR" | "CTRI" | "ISRCTN";
};

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
  | undefined {
  if (!raw) return undefined;
  const s = String(raw).toLowerCase();
  if (s.startsWith("recruit")) return "Recruiting";
  if (s.startsWith("complete")) return "Completed";
  if (s.startsWith("active")) return "Active, not recruiting";
  if (s.startsWith("enrolling")) return "Enrolling by invitation";
  if (
    raw === "Recruiting" ||
    raw === "Completed" ||
    raw === "Active, not recruiting" ||
    raw === "Enrolling by invitation"
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
  "Recruiting"|"Completed"|"Active, not recruiting"|"Enrolling by invitation"|undefined {
  if (!raw) return undefined;
  const s = String(raw).toLowerCase();
  if (s.includes("recruit")) return "Recruiting";
  if (s.includes("complete") || s.includes("completed")) return "Completed";
  if (s.includes("active")) return "Active, not recruiting";
  if (s.includes("invite")) return "Enrolling by invitation";
  return normalizeStatus(raw);
}

function containsAny(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some(n => h.includes(n.toLowerCase()));
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
  // 1) fetch from all sources in parallel
  const [ctgov, euctr, ctri] = await Promise.allSettled([
    clinicalTrialsGovFetch({ query: input.query, genes: input.genes }),
    fetchEUCTR(input.query),
    fetchCTRI(input.query),
  ]);

  const fromCT =
    ctgov.status === "fulfilled"
      ? (ctgov.value as any[]).map(r => ({ ...r, source: "CTgov" as const }))
      : [];
  const fromEU = euctr.status === "fulfilled" ? (euctr.value as any[]) : [];
  const fromIN = ctri.status === "fulfilled" ? (ctri.value as any[]) : [];

  // 2) merge
  const merged = [...fromCT, ...fromEU, ...fromIN];

  // 3) optional ISRCTN enrichment skipped

  // 4) normalize + filter (reuse your existing filters)
  const wantPhase = input.phase;
  const wantStatus = input.status;
  const wantCountry = input.country?.toLowerCase();
  const wantGenes = (input.genes || []).map(g => g.trim()).filter(Boolean);

  const filtered = merged.filter((r: any) => {
    const p = normalizePhaseLoose(r.phase);
    const st = normalizeStatusLoose(r.status);
    const ctry = (r.country || "").toLowerCase();
    const title = r.title || "";

    if (!phaseMatches(wantPhase, p)) return false;
    if (wantStatus && st !== wantStatus) return false;
    if (wantCountry && ctry && ctry !== wantCountry) return false;
    if (wantGenes.length && !containsAny(title, wantGenes)) return false;

    return true;
  });

  // 5) map to Trial shape
  return filtered.map((r: any) => ({
    id: r.nctId || r.id,
    title: r.title,
    url: r.url,
    phase: normalizePhaseLoose(r.phase),
    status: normalizeStatusLoose(r.status),
    country: r.country,
    gene: r.gene,
    source: r.source,
  }));
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
