import { NextRequest, NextResponse } from "next/server";
import { orchestrateResearch } from "@/lib/research/orchestrator";

// Uses xml2js under the hood which depends on Node core modules
// so ensure this route runs in a Node.js environment rather than Edge.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { query, filters, audience } = await req.json();
  if (!query || typeof query !== "string") {
    return NextResponse.json({ citations: [], followUps: [] });
  }
  try {
    const pack = await orchestrateResearch(query, {
      mode: audience === "patient" ? "patient" : "doctor",
      filters: filters || {}
    });
    return NextResponse.json({
      citations: (pack?.citations || []).slice(0, 12),
      followUps: pack?.followUps || [],
      tookMs: pack?.meta?.tookMs || 0
    });
  } catch {
    return NextResponse.json({ citations: [], followUps: [] });
  }
}
