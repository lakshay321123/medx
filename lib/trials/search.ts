type Input = {
  query?: string;
  phase?: "1" | "2" | "3" | "4";
  status?:
    | "Recruiting"
    | "Completed"
    | "Active, not recruiting"
    | "Enrolling by invitation";
  country?: string; // use plain names like "United States", "India", "China"
  genes?: string[]; // e.g., ["EGFR","ALK"]
};

// Public shape used by UI table
export type Trial = {
  id: string;
  title: string;
  url: string;
  phase?: "1" | "2" | "3" | "4";
  status?:
    | "Recruiting"
    | "Completed"
    | "Active, not recruiting"
    | "Enrolling by invitation";
  country?: string;
  gene?: string;
};

// --- helpers ---------------------------------------------------

function normalizePhase(raw?: string): "1" | "2" | "3" | "4" | undefined {
  if (!raw) return undefined;
  const s = String(raw).toLowerCase();
  if (s.includes("phase 1")) return "1";
  if (s.includes("phase 2")) return "2";
  if (s.includes("phase 3")) return "3";
  if (s.includes("phase 4")) return "4";
  if (s === "1" || s === "2" || s === "3" || s === "4") return s as any;
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
  // fall through: keep original capitalisation if it already matches
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
  return needles.some((n) => h.includes(n.toLowerCase()));
}

// --- external --------------------------------------------------

export async function searchTrials(input: Input): Promise<Trial[]> {
  // 1) Fetch broadly (query + genes words only), then 2) filter locally for correctness.
  const results = await clinicalTrialsGovFetch({
    query: input.query,
    genes: input.genes,
  });

  const wantPhase = input.phase;
  const wantStatus = input.status;
  const wantCountry = input.country?.toLowerCase();
  const wantGenes = (input.genes || []).map((g) => g.trim()).filter(Boolean);

  const filtered = results.filter((r: any) => {
    const p = normalizePhase(r.phase);
    const st = normalizeStatus(r.status);
    const ctry = (r.country || "").toLowerCase();
    const title = r.title || "";

    if (wantPhase && p !== wantPhase) return false;
    if (wantStatus && st !== wantStatus) return false;
    if (wantCountry && ctry && ctry !== wantCountry) return false;

    // If genes were requested, require that at least one appears in the title (fallback).
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
  }));
}

// --- underlying fetch using CT.gov v2 --------------------------

async function clinicalTrialsGovFetch(input: {
  query?: string;
  genes?: string[];
}): Promise<any[]> {
  const terms: string[] = [];
  if (input.query) terms.push(input.query);
  if (input.genes?.length) terms.push(input.genes.join(" "));
  const q = encodeURIComponent(terms.join(" ").trim());

  const url = `https://clinicaltrials.gov/api/v2/studies?format=json&query.term=${q}&pageSize=25`;
  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClinicalTrials.gov error ${res.status}: ${text}`);
  }

  const data = await res.json();

  // Map to a consistent shape (raw values preserved for normalization above)
  return (data?.studies || []).map((s: any) => ({
    id: s.protocolSection?.identificationModule?.nctId,
    title: s.protocolSection?.identificationModule?.briefTitle,
    url: `https://clinicaltrials.gov/study/${s.protocolSection?.identificationModule?.nctId}`,
    phase: s.protocolSection?.designModule?.phases?.[0], // e.g., "Phase 2"
    status: s.protocolSection?.statusModule?.overallStatus, // e.g., "Recruiting"
    country: s.protocolSection?.contactsLocationsModule?.locations?.[0]?.country, // best-effort
    gene: undefined,
  }));
}

