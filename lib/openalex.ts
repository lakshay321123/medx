import type { Paper } from "@/types/research";
const BASE = "https://api.openalex.org";

function decodeAbstract(ii: Record<string, number[]> | undefined): string | null {
  if (!ii) return null;
  const entries = Object.entries(ii).flatMap(([word, idxs]) => idxs.map(i => ({ i, word })));
  entries.sort((a, b) => a.i - b.i);
  return entries.map(e => e.word).join(" ");
}

export async function searchOpenAlexWorks(q: string, perPage = 10, from?: string, is_oa?: boolean): Promise<Paper[]> {
  const url = new URL(`${BASE}/works`);
  if (q) url.searchParams.set("search", q);
  url.searchParams.set("per-page", String(Math.min(50, Math.max(1, perPage))));
  if (from) url.searchParams.set("from_publication_date", from);
  if (typeof is_oa === "boolean") url.searchParams.set("is_oa", String(is_oa));
  if (process.env.OPENALEX_MAILTO) url.searchParams.set("mailto", process.env.OPENALEX_MAILTO);
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return [];
  const j = await r.json();
  const results = j?.results || [];
  return results.map((w: any): Paper => ({
    id: w.id,
    title: w.display_name,
    abstract: decodeAbstract(w.abstract_inverted_index),
    year: w.publication_year,
    type: w.type,
    authors: (w.authorships || []).map((a: any) => ({ name: a.author?.display_name, id: a.author?.id })),
    venue: { name: w.primary_location?.source?.display_name, issn: (w.primary_location?.source?.issn || [])[0] },
    cited_by_count: w.cited_by_count,
    is_oa: w.open_access?.is_oa,
    oa_url: w.open_access?.oa_url ?? null,
    url: w.primary_location?.landing_page_url ?? null,
    doi: w.doi ?? null,
    source: "openalex",
  }));
}

export async function getOpenAlexWorkById(id: string): Promise<Paper | null> {
  const url = new URL(`${BASE}/works/${id}`);
  if (process.env.OPENALEX_MAILTO) url.searchParams.set("mailto", process.env.OPENALEX_MAILTO);
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return null;
  const w = await r.json();
  return {
    id: w.id,
    title: w.display_name,
    abstract: decodeAbstract(w.abstract_inverted_index),
    year: w.publication_year,
    type: w.type,
    authors: (w.authorships || []).map((a: any) => ({ name: a.author?.display_name, id: a.author?.id })),
    venue: { name: w.primary_location?.source?.display_name, issn: (w.primary_location?.source?.issn || [])[0] },
    cited_by_count: w.cited_by_count,
    is_oa: w.open_access?.is_oa,
    oa_url: w.open_access?.oa_url ?? null,
    url: w.primary_location?.landing_page_url ?? null,
    doi: w.doi ?? null,
    source: "openalex",
  };
}
