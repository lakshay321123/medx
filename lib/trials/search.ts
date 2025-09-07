// Add a Phase type that includes mixed values
type PhaseStr = "1" | "2" | "3" | "4" | "1/2" | "2/3";

import { whoICTRPFetch } from "./fetchICTRP";

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
  source?: string;
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
  // Fetch broadly (query + genes words) from multiple sources, then filter locally for correctness.
  const [ctgov, ictrp] = await Promise.all([
    clinicalTrialsGovFetch({ query: input.query, genes: input.genes }),
    whoICTRPFetch(input.query)
  ]);

  const taggedCtgov = ctgov.map(r => ({ ...r, source: "CTgov" }));
  const taggedIctrp = ictrp.map(r => ({ ...r, source: "ICTRP" }));
  const results = [...taggedCtgov, ...taggedIctrp];

  const wantStatus = input.status;
  const wantCountry = input.country?.toLowerCase();
  const wantGenes = (input.genes || []).map(g => g.trim()).filter(Boolean);

  const filtered = results.filter((r: any) => {
    const p = normalizePhase(r.phase);
    const st = normalizeStatus(r.status);
    const ctry = (r.country || "").toLowerCase();
    const title = r.title || "";

    if (!phaseMatches(input.phase, p)) return false;
    if (wantStatus && st !== wantStatus) return false;
    if (wantCountry && ctry && ctry !== wantCountry) return false;
    if (wantGenes.length && !containsAny(title, wantGenes)) return false;

    return true;
  });

  return filtered.map((r: any) => ({
    id: r.nctId || r.id,
    title: r.title,
    url: r.url,
    phase: normalizePhase(r.phase),
    status: normalizeStatus(r.status),
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
