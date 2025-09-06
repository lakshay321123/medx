import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";

export async function GET(req: NextRequest) {
  if (!flags.enableSemanticScholar) return NextResponse.json({ disabled: true });

  const params = new URL(req.url).searchParams;
  const q = params.get("q") || "";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  url.searchParams.set("query", q);
  url.searchParams.set("limit", "10");
  url.searchParams.set(
    "fields",
    [
      "title",
      "abstract",
      "year",
      "publicationTypes",
      "venue",
      "authors",
      "url",
      "openAccessPdf",
      "citationCount",
      "externalIds",
      "publicationDate"
    ].join(",")
  );

  const r = await fetch(url.toString(), { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
  const j = await r.json();

  const works = (j.data || []).map((p: any) => ({
    id: p.paperId,
    title: p.title,
    abstract: p.abstract || null,
    year: p.year ?? (p.publicationDate ? Number(p.publicationDate.slice(0, 4)) : null),
    type: p.publicationTypes?.[0] || null,
    authors: (p.authors || []).map((a: any) => ({ name: a.name, id: a.authorId })),
    venue: { name: p.venue || null },
    cited_by_count: p.citationCount,
    is_oa: !!p.openAccessPdf,
    oa_url: p.openAccessPdf?.url || null,
    url: p.url || null,
    doi: p.externalIds?.DOI || null,
    source: "semanticscholar",
  }));

  return NextResponse.json({ works });
}
