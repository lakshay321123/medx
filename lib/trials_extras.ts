import type { Trial } from "@/types/research";

// ISRCTN (simple JSON)
export async function searchISRCTN(condition: string): Promise<Trial[]> {
  const url = `https://www.isrctn.com/api/v1/search?condition=${encodeURIComponent(condition)}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return [];
  const j = await r.json();
  const rows = j?.results || [];
  return rows.map((t: any): Trial => ({
    id: t.isrctn,
    title: t.title,
    conditions: (t.conditions || "").split(";").map((x: string) => x.trim()).filter(Boolean),
    interventions: [],
    status: t.status,
    phase: t.phase,
    city: t.cities?.[0],
    country: t.countries?.[0],
    url: `https://www.isrctn.com/${t.isrctn}`,
    source: "isrctn",
    eligibility: t.eligibility ?? undefined,
    primaryOutcome: t.primaryOutcome ?? undefined,
    sponsor: t.sponsorName ?? undefined,
    type: t.studyDesign ?? undefined,
  }));
}

// EU CTR: XML dump; here we expose the raw download URL for client or later ETL
export function euctrFeedUrl() {
  return "https://www.clinicaltrialsregister.eu/ctr-search/rest/download/full";
}

// WHO ICTRP: point to platform (no stable REST); leave for ETL later
export function ictrpInfoUrl() {
  return "https://www.who.int/clinical-trials-registry-platform";
}
