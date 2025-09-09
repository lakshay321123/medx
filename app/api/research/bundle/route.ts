import { NextRequest, NextResponse } from "next/server";
import { orchestrateResearch, orchestrateTrials } from "@/lib/research/orchestrator";

// Uses xml2js under the hood which depends on Node core modules
// so ensure this route runs in a Node.js environment rather than Edge.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { query, filters, audience } = await req.json();
  if (!query || typeof query !== "string") {
    return NextResponse.json({ citations: [], followUps: [] });
  }
  try {
    const trialsPromise = orchestrateTrials(query, { country: filters?.countries?.[0] });
    const packPromise = orchestrateResearch(query, {
      mode: audience === "patient" ? "patient" : "doctor",
      filters: filters || {},
    });

    const [trials, pack] = await Promise.all([trialsPromise, packPromise]);

    const trialCitations = (trials || []).slice(0, 6).map((t) => ({
      title: `${t.registry}:${t.registry_id} — ${t.title}`.slice(0, 140),
      url: t.url,
      source: "trials",
      snippet: [t.phase, t.status].filter(Boolean).join(" · "),
    }));

    const citations = [...trialCitations, ...(pack?.citations || [])];

    return NextResponse.json({
      citations: citations.slice(0, 12),
      followUps: pack?.followUps || [],
      tookMs: pack?.meta?.tookMs || 0,
    });
  } catch {
    return NextResponse.json({ citations: [], followUps: [] });
  }
}
