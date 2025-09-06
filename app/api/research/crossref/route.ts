import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";

function stripHtml(str: string | undefined): string | null {
  if (!str) return null;
  return str.replace(/<[^>]+>/g, "");
}

export async function GET(req: NextRequest) {
  if (!flags.enableCrossref) return NextResponse.json({ disabled: true });
  const q = new URL(req.url).searchParams.get("q") || "";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query", q);
  url.searchParams.set("rows", "10");

  const r = await fetch(url.toString(), { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
  const j = await r.json();

  const works = (j.message?.items || []).map((p: any) => {
    const year = p.published?.["date-parts"]?.[0]?.[0] || p.issued?.["date-parts"]?.[0]?.[0];
    return {
      id: p.DOI ? `https://doi.org/${p.DOI}` : p.URL,
      title: p.title?.[0] || "",
      abstract: stripHtml(p.abstract),
      year: year ?? null,
      type: p.type ?? null,
      authors: (p.author || []).map((a: any) => ({
        name: `${a.given || ""} ${a.family || ""}`.trim(),
        id: a.ORCID,
      })),
      venue: { name: p["container-title"]?.[0] || null, issn: p.ISSN?.[0] || null },
      cited_by_count: p["is-referenced-by-count"],
      is_oa: !!p.license,
      oa_url: p.license?.[0]?.URL || null,
      url: p.URL || null,
      doi: p.DOI || null,
      source: "crossref",
    };
  });

  return NextResponse.json({ works });
}
