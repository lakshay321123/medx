import { NextRequest, NextResponse } from "next/server";
import { fetchTrials as fetchCTGovTrials } from "@/lib/trials";
import { searchTrials } from "@/lib/trials/search";

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

    // 4) Merge and (optionally) de-dupe by (id OR title+country)
    const seen = new Set<string>();
    const deduped = [...ctgov, ...globalRows].filter(r => {
      const key = (r.id || "") + "|" + (r.country || "") + "|" + r.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ rows: deduped, page, pageSize });
  } catch (e) {
    console.error("[/api/trials] error", e);
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const trials = await searchTrials(body);
    return NextResponse.json({ trials });
  } catch (err) {
    console.error("Trials API error", err);
    return NextResponse.json({ trials: [], error: "Failed to fetch trials" });
  }
}
