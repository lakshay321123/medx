import { NextResponse } from "next/server";
import { searchTrials, dedupeTrials, rankValue } from "@/lib/trials/search";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const q = typeof body.query === "string" ? body.query.trim() : undefined;
    const phase = body.phase as "1" | "2" | "3" | "4" | undefined;
    // accept all UI statuses
    const status = body.status as
      | "Recruiting"
      | "Completed"
      | "Active, not recruiting"
      | "Enrolling by invitation"
      | undefined;
    const country = typeof body.country === "string" ? body.country : undefined;
    const genes = Array.isArray(body.genes) ? body.genes : undefined;

    const source = typeof body.source === "string" ? body.source : "All";
    const trials = await searchTrials({ query: q, phase, status, country, genes });
    const ranked = dedupeTrials(trials).sort((a,b)=>rankValue(b)-rankValue(a));
    const out = source === "All" ? ranked : ranked.filter(t => t.source === source);

    return NextResponse.json({ trials: out });
  } catch (err: any) {
    console.error("[API] /api/trials/search error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch trials" },
      { status: 500 }
    );
  }
}

