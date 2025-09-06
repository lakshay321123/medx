import type { Paper } from "@/types/research";
const BASE = "https://api.crossref.org";

export async function searchCrossref(q: string, rows = 10): Promise<Paper[]> {
  const url = new URL(`${BASE}/works`);
  url.searchParams.set("query", q);
  url.searchParams.set("rows", String(Math.min(50, Math.max(1, rows))));
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return [];
  const j = await r.json();
  const items = j?.message?.items || [];
  return items.map((p: any): Paper => ({
    id: p.DOI ?? p.URL,
    title: Array.isArray(p.title) ? p.title[0] : p.title,
    abstract: p.abstract ? p.abstract.replace(/<[^>]+>/g, "") : null,
    year: p.issued?.["date-parts"]?.[0]?.[0] ?? null,
    type: p.type ?? null,
    authors: (p.author || []).map((a: any) => ({ name: [a.given, a.family].filter(Boolean).join(" ") })),
    venue: { name: p["container-title"]?.[0], issn: (p.ISSN || [])[0] },
    cited_by_count: p["is-referenced-by-count"] ?? undefined,
    is_oa: undefined,
    oa_url: undefined,
    url: p.URL ?? null,
    doi: p.DOI ?? null,
    source: "crossref",
  }));
}
