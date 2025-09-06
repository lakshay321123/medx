import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";

export async function GET(req: NextRequest) {
  if (!flags.enableUnpaywall) return NextResponse.json({ disabled: true });
  const doi = new URL(req.url).searchParams.get("doi") || "";
  if (!doi) return NextResponse.json({ error: "doi required" }, { status: 400 });

  const email = process.env.UNPAYWALL_EMAIL;
  const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email || "")}`;

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
  const p = await r.json();

  const work = {
    id: p.doi,
    title: p.title,
    abstract: null,
    year: p.year ?? null,
    type: p.genre ?? null,
    authors: (p.z_authors || []).map((a: any) => ({ name: a.family ? `${a.given || ""} ${a.family}`.trim() : a.name })),
    venue: { name: p.journal_name, issn: p.journal_issn_l },
    cited_by_count: undefined,
    is_oa: p.is_oa,
    oa_url: p.best_oa_location?.url ?? null,
    url: p.best_oa_location?.url ?? p.doi_url ?? null,
    doi: p.doi,
    source: "unpaywall",
  };

  return NextResponse.json({ work });
}
