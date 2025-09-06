import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";

export async function GET(req: NextRequest) {
  if (!flags.enableNCBIBooks) return NextResponse.json({ disabled: true });
  const q = new URL(req.url).searchParams.get("q") || "";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  const esearch = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
  esearch.searchParams.set("db", "books");
  esearch.searchParams.set("retmode", "json");
  esearch.searchParams.set("term", q);

  const r1 = await fetch(esearch.toString(), { cache: "no-store" });
  if (!r1.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
  const j1 = await r1.json();
  const ids = j1.esearchresult?.idlist || [];
  if (!ids.length) return NextResponse.json({ books: [] });

  const esummary = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi");
  esummary.searchParams.set("db", "books");
  esummary.searchParams.set("retmode", "json");
  esummary.searchParams.set("id", ids.join(","));

  const r2 = await fetch(esummary.toString(), { cache: "no-store" });
  if (!r2.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
  const j2 = await r2.json();

  const books = ids.map((id: string) => ({
    id,
    title: j2.result?.[id]?.title,
    url: j2.result?.[id]?.docurl,
  })).filter((b: any) => b.title);

  return NextResponse.json({ books });
}
