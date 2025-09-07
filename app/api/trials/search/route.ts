import { NextRequest, NextResponse } from "next/server";

// Map friendly filters → CT.gov query fragments
function buildExpr({ condition, genes, keywords }: any) {
  const parts: string[] = [];
  if (condition) parts.push(`(${condition})`);
  if (genes) {
    const g = String(genes)
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .map(g => `(${g})`);
    if (g.length) parts.push(g.join(" OR "));
  }
  if (keywords) parts.push(`(${keywords})`);
  return parts.length ? parts.join(" AND ") : "all";
}

function mapCountry(c: string) {
  if (c === "Worldwide") return undefined; // no country filter
  if (c === "European Union") return "Europe"; // CT.gov uses regions loosely in locations
  if (c === "United Kingdom") return "United Kingdom";
  return c;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { condition, phase, status, country, genes, keywords } = body || {};

  const expr = buildExpr({ condition, genes, keywords });
  // We request core fields to draw the table
  const fields = [
    "NCTId","BriefTitle","Phase","OverallStatus",
    "LocationCity","LocationCountry"
  ].join(",");

  // Basic pagination window
  const url = new URL("https://clinicaltrials.gov/api/query/study_fields");
  url.searchParams.set("expr", expr);
  url.searchParams.set("min_rnk", "1");
  url.searchParams.set("max_rnk", "50");
  url.searchParams.set("fmt", "json");
  url.searchParams.set("fields", fields);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return NextResponse.json({ rows: [], error: `ctgov ${res.status}` }, { status: 200 });

  const json = await res.json();
  const list = json?.StudyFieldsResponse?.StudyFields || [];

  // Client side filters (phase/status/country) for simplicity
  const countryNeedle = mapCountry(country);
  const rows = list
    .map((s: any) => {
      const take = (k: string) => (Array.isArray(s[k]) ? s[k][0] : s[k]);
      return {
        nctId: take("NCTId"),
        title: take("BriefTitle"),
        phase: take("Phase"),
        status: take("OverallStatus"),
        city: take("LocationCity"),
        country: take("LocationCountry"),
      };
    })
    .filter((r: any) => {
      if (phase && phase !== "Any" && !(r.phase || "").includes(phase)) return false;
      if (status && status !== "Any" && r.status !== status) return false;
      if (countryNeedle && r.country !== countryNeedle) return false;
      return true;
    });

  return NextResponse.json({ rows });
}

