import { NextRequest, NextResponse } from "next/server";
import { fetchTrials as fetchCTGovTrials } from "@/lib/trials";
import { searchTrials, dedupeTrials, rankValue } from "@/lib/trials/search";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const condition = searchParams.get("condition") || "";
    if (!condition) {
      return NextResponse.json({ error: "condition is required" }, { status: 400 });
    }
    const country  = searchParams.get("country") || undefined;
    const city     = searchParams.get("city") || undefined;
    const status   = searchParams.get("status") || undefined; // "Recruiting,Enrolling by invitation"
    const phase    = searchParams.get("phase") || undefined;  // "Phase 2,Phase 3"
    const page     = Number(searchParams.get("page") || "1");
    const pageSize = Number(searchParams.get("pageSize") || "10");
    const source   = searchParams.get("source") || "All";

    // 1) Keep the existing CT.gov table rows
    const ctgov = await fetchCTGovTrials({
      condition,
      country,
      city,
      status,
      phase,
      min: (page - 1) * pageSize + 1,
      max: page * pageSize,
    });
    const ctgovWithSource = ctgov.map(r => ({ ...r, source: "CTgov" as const }));

    // 2) Also fetch global sources via your aggregator (EUCTR / CTRI / ISRCTN)
    //    Map GET params -> aggregator input
    const wantPhase = (phase || "").match(/\b(\d)\b/)?.[1] as "1"|"2"|"3"|"4"|undefined; // anchor phase
    const trials = await searchTrials({
      query: condition,
      phase: wantPhase,
      status: status as any,
      country,
      genes: undefined,
    });

    // 3) Convert aggregator Trial -> table TrialRow (best-effort)
    const globalRows = trials.map(t => ({
      id: t.id,
      title: t.title,
      conditions: [],                // unknown from EUCTR/CTRI mappings
      interventions: [],
      status: t.status || "",
      phase: t.phase ? `Phase ${t.phase}` : "",
      start: undefined,
      complete: undefined,
      type: undefined,
      sponsor: undefined,
      site: undefined,
      city: undefined,
      country: t.country,
      eligibility: undefined,
      primaryOutcome: undefined,
      url: t.url,
      source: t.source,              // "EUCTR" | "CTRI" | "ISRCTN" | "CTgov"
    }));

    // 4) Merge, de-dupe, rank, and filter by source
    const rows = dedupeTrials([...ctgovWithSource, ...globalRows]).sort((a,b)=>rankValue(b)-rankValue(a));
    const rowsFilteredBySource = source === "All" ? rows : rows.filter(r => r.source === source);

    return NextResponse.json({ rows: rowsFilteredBySource, page, pageSize });
  } catch (e) {
    console.error("[/api/trials] error", e);
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const source = body.source || "All";
    const trials = await searchTrials(body);
    const ranked = dedupeTrials(trials).sort((a,b)=>rankValue(b)-rankValue(a));
    const out = source === "All" ? ranked : ranked.filter(t => t.source === source);
    return NextResponse.json({ trials: out });
  } catch (err) {
    console.error("Trials API error", err);
    return NextResponse.json({ trials: [], error: "Failed to fetch trials" });
  }
}
