import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";

function invertAbstract(obj: any): string | null {
  if (!obj) return null;
  const arr: string[] = [];
  for (const [word, positions] of Object.entries(obj)) {
    (positions as number[]).forEach((p) => (arr[p] = word));
  }
  return arr.join(" ");
}

export async function GET(req: NextRequest) {
  if (!flags.enableOpenAlex) return NextResponse.json({ disabled: true });

  const params = new URL(req.url).searchParams;
  const q = params.get("q") || "";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
  const is_oa = params.get("is_oa");
  const from = params.get("from");
  const perPage = params.get("perPage") || "10";

  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", q);
  const filters: string[] = [];
  if (is_oa) filters.push(`is_oa:${is_oa}`);
  if (from) filters.push(`from_publication_date:${from}`);
  if (filters.length) url.searchParams.set("filter", filters.join(","));
  url.searchParams.set("per-page", perPage);
  const mail = process.env.OPENALEX_MAILTO;
  if (mail) url.searchParams.set("mailto", mail);

  const r = await fetch(url.toString(), { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
  const j = await r.json();

  const works = (j.results || []).map((w: any) => ({
    id: w.id,
    title: w.display_name,
    abstract: invertAbstract(w.abstract_inverted_index),
    year: w.publication_year ?? null,
    type: w.type ?? null,
    authors: (w.authorships || []).map((a: any) => ({ name: a.author?.display_name, id: a.author?.id })),
    venue: { name: w.primary_location?.source?.display_name, issn: w.primary_location?.source?.issn?.[0] || null },
    cited_by_count: w.cited_by_count,
    is_oa: w.open_access?.is_oa,
    oa_url: w.open_access?.oa_url || null,
    url: w.primary_location?.landing_page_url || w.id,
    doi: w.doi || null,
    source: "openalex",
  }));

  return NextResponse.json({ works });
}
