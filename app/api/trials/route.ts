import { NextRequest, NextResponse } from "next/server";
import { searchTrials, dedupeTrials, rankValue } from "@/lib/trials/search";
import { byCode3, byName } from "@/data/countries";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const condition = (searchParams.get("condition") || "").trim();
    if (!condition) {
      return NextResponse.json({ error: "condition is required" }, { status: 400 });
    }

    const rawCountry = (searchParams.get("country") || "").trim(); // "" | "IND" | "India" | "USA"
    const status = searchParams.get("status") || undefined; // e.g., "Recruiting,Enrolling by invitation"
    const phaseUI = searchParams.get("phase") || undefined; // e.g., "Phase 2,Phase 3"

    // Accept both code3 and name; blank = Worldwide
    let wantCountry: string | undefined = undefined;
    if (rawCountry) {
      const byCode = byCode3(rawCountry);
      wantCountry = byCode?.name || byName(rawCountry)?.name || rawCountry;
    }

    // Normalize phases to digits "2,3"
    const wantPhase = phaseUI
      ? phaseUI
          .split(",")
          .map((s) => s.replace(/[^0-9/]/g, ""))
          .filter(Boolean)
          .join(",")
      : undefined;

    // Aggregated search (CT.gov + CTRI + EUCTR + ISRCTN)
    const trials = await searchTrials({
      query: condition,
      phase: wantPhase as any,
      status: status as any,
      country: wantCountry, // undefined => Worldwide
    });

    // Rank & de-dup
    const ranked = dedupeTrials(trials).sort((a, b) => rankValue(b) - rankValue(a));

    // Map to table rows
    const rows = ranked.map((t) => ({
      id: t.id,
      title: t.title,
      conditions: [],
      interventions: [],
      status: t.status || "",
      phase: t.phase ? (t.phase.includes("/") ? t.phase : `Phase ${t.phase}`) : "",
      studyType: "",
      sponsor: "",
      locations: [],
      url: t.url || "",
      country: t.country || "",
      source: t.source || "",
    }));

    // Fallback: if strict country yields 0, retry Worldwide once
    if (rows.length === 0 && wantCountry) {
      const global = await searchTrials({
        query: condition,
        phase: wantPhase as any,
        status: status as any,
        country: undefined,
      });
      const ranked2 = dedupeTrials(global).sort((a, b) => rankValue(b) - rankValue(a));
      const rows2 = ranked2.map((t) => ({
        id: t.id,
        title: t.title,
        conditions: [],
        interventions: [],
        status: t.status || "",
        phase: t.phase ? (t.phase.includes("/") ? t.phase : `Phase ${t.phase}`) : "",
        studyType: "",
        sponsor: "",
        locations: [],
        url: t.url || "",
        country: t.country || "",
        source: t.source || "",
      }));
      return NextResponse.json({ rows: rows2, page: 1, pageSize: rows2.length });
    }

    return NextResponse.json({ rows, page: 1, pageSize: rows.length });
  } catch (err) {
    console.error("Trials API GET error", err);
    return NextResponse.json(
      { rows: [], page: 1, pageSize: 0, error: "Trials fetch failed" },
      { status: 500 }
    );
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
