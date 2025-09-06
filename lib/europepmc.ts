import type { Paper } from "@/types/research";
const BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest";

export async function searchEuropePMC(q: string, pageSize = 10): Promise<Paper[]> {
  const url = new URL(`${BASE}/search`);
  url.searchParams.set("query", q);
  url.searchParams.set("resulttype", "core");
  url.searchParams.set("format", "json");
  url.searchParams.set("pageSize", String(Math.min(50, Math.max(1, pageSize))));
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return [];
  const j = await r.json();
  const res = j?.resultList?.result || [];
  return res.map((p: any): Paper => ({
    id: p.id,
    title: p.title,
    abstract: p.abstractText ?? null,
    year: p.pubYear ? Number(p.pubYear) : null,
    type: p.pubType ?? null,
    authors: (p.authorList?.author || []).map((a: any) => ({ name: a.fullName })),
    venue: { name: p.journalInfo?.journal?.title, issn: p.journalInfo?.journal?.issn },
    cited_by_count: p.citedByCount ? Number(p.citedByCount) : undefined,
    is_oa: p.isOpenAccess === "Y",
    oa_url: p.fullTextUrlList?.fullTextUrl?.[0]?.url ?? null,
    url: p.fullTextUrlList?.fullTextUrl?.[0]?.url ?? p.uri ?? null,
    doi: p.doi ?? null,
    source: "europepmc",
  }));
}
