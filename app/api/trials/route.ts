import { NextRequest, NextResponse } from "next/server";
import { searchTrials, dedupeTrials, rankValue } from "@/lib/trials/search";
import { byCode3 } from "@/data/countries";

export const runtime = "nodejs"; // ensure node runtime for scrapes/fetches

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const condition = (searchParams.get("condition") || "").trim();
    if (!condition) {
      return NextResponse.json({ error: "condition is required" }, { status: 400 });
    }

    // UI passes code3 (e.g., "IND", "USA") or blank for Worldwide
    const code3   = (searchParams.get("country") || "").trim();
    const status  = searchParams.get("status") || undefined;   // e.g., "Recruiting,Enrolling by invitation"
    const phaseUI = searchParams.get("phase") || undefined;    // e.g., "Phase 2,Phase 3"

    // Normalize
    const wantCountry = code3 ? byCode3(code3)?.name : undefined; // "India" / "United States"
    const wantPhase = phaseUI
      ? phaseUI.split(",").map(s => s.replace(/[^0-9/]/g, "")).filter(Boolean).join(",")
      : undefined;

    // Aggregated fetch (CT.gov + EUCTR + CTRI + ISRCTN)
    const trials = await searchTrials({
      query: condition,
      phase: wantPhase as any,
      status: status as any,
      country: wantCountry,  // undefined = Worldwide
      genes: undefined,
    });

    const ranked = dedupeTrials(trials).sort((a,b) => rankValue(b) - rankValue(a));

    // Map to table row shape
    const rows = ranked.map(t => ({
      id: t.id,
      title: t.title,
      conditions: [],
      interventions: [],
      status: t.status || "",
      phase: t.phase ? (t.phase.includes("/") ? t.phase : `Phase ${t.phase}`) : "",
      studyType: "",
      sponsor: "",
      locations: [],
      eligibility: undefined,
      primaryOutcome: undefined,
      url: t.url || "",
      country: t.country || "",
      source: t.source || "",
    }));

    return NextResponse.json({ rows, page: 1, pageSize: rows.length });
  } catch (err) {
    console.error("Trials API GET error", err);
    return NextResponse.json({ rows: [], page: 1, pageSize: 0, error: "Trials fetch failed" }, { status: 500 });
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
