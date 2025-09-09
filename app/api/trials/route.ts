import { NextRequest, NextResponse } from "next/server";
import { orchestrateTrials } from "@/lib/research/orchestrator";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("condition") || "").trim();
    if (!query) {
      return NextResponse.json({ error: "condition is required" }, { status: 400 });
    }
    const country = searchParams.get("country") || undefined;
    const status = searchParams.get("status") || undefined;
    const phase = searchParams.get("phase") || undefined;

    const trials = await orchestrateTrials(query, {
      country,
      phase,
      status,
    });
    return NextResponse.json({ rows: trials, page: 1, pageSize: trials.length });
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
    const { query, phase, status, country } = await req.json();
    const trials = await orchestrateTrials(query, { country, phase, status });
    return NextResponse.json({ trials });
  } catch (err) {
    console.error("Trials API error", err);
    return NextResponse.json({ trials: [], error: "Failed to fetch trials" });
  }
}
