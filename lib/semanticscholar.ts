import type { Paper } from "@/types/research";
const BASE = "https://api.semanticscholar.org/graph/v1";

export async function searchSemanticScholar(q: string, limit = 10): Promise<Paper[]> {
  const url = new URL(`${BASE}/paper/search`);
  url.searchParams.set("query", q);
  url.searchParams.set("limit", String(Math.min(50, Math.max(1, limit))));
  url.searchParams.set("fields", "title,abstract,url,year,citationCount,publicationTypes,authors,externalIds");
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return [];
  const j = await r.json();
  return (j?.data || []).map((p: any): Paper => ({
    id: p.paperId,
    title: p.title,
    abstract: p.abstract ?? null,
    year: p.year ?? null,
    type: (p.publicationTypes || [])[0] ?? null,
    authors: (p.authors || []).map((a: any) => ({ name: a.name, id: a.authorId })),
    venue: { name: undefined, issn: undefined },
    cited_by_count: p.citationCount ?? 0,
    is_oa: undefined,
    oa_url: undefined,
    url: p.url ?? null,
    doi: p.externalIds?.DOI ?? null,
    source: "semanticscholar",
  }));
}
