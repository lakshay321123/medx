import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";

export async function GET(req: NextRequest) {
  if (!flags.enableEuropePMC) return NextResponse.json({ disabled: true });
  const q = new URL(req.url).searchParams.get("q") || "";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  const url = new URL("https://www.ebi.ac.uk/europepmc/webservices/rest/search");
  url.searchParams.set("query", q);
  url.searchParams.set("resulttype", "core");
  url.searchParams.set("format", "json");
  url.searchParams.set("pageSize", "10");

  const r = await fetch(url.toString(), { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
  const j = await r.json();

  const res = (j?.resultList?.result || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    abstract: p.abstractText ?? null,
    year: p.pubYear ? Number(p.pubYear) : null,
    type: p.pubType ?? null,
    authors: (p.authorList?.author || []).map((a: any) => ({ name: a.fullName })),
    venue: {
      name: p.journalInfo?.journal?.title,
      issn: p.journalInfo?.journal?.issn,
    },
    cited_by_count: p.citedByCount ? Number(p.citedByCount) : undefined,
    is_oa: p.isOpenAccess === "Y",
    oa_url: p.fullTextUrlList?.fullTextUrl?.[0]?.url ?? null,
    url: p.fullTextUrlList?.fullTextUrl?.[0]?.url ?? p.uri ?? null,
    doi: p.doi ?? null,
    source: "europepmc",
  }));

  return NextResponse.json({ works: res });
}
