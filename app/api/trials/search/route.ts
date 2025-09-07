import { NextResponse } from "next/server";
import { fetchTrials } from "@/lib/trials";
import type { TrialRow } from "@/types/trials";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const condition = searchParams.get("condition") || "";
    const phaseParam = searchParams.get("phase");
    const statusParam = searchParams.get("status");
    const countryParam = searchParams.get("country");
    const genesParam = searchParams.get("genes");

    const phase = phaseParam && phaseParam !== "any" ? `Phase ${phaseParam}` : undefined;
    const status = statusParam && statusParam !== "any" ? statusParam : undefined;
    const countries = countryParam
      ? countryParam.split(",").map((c) => c.trim()).filter(Boolean)
      : [];
    const genes = genesParam
      ? genesParam.split(",").map((g) => g.trim()).filter(Boolean)
      : [];

    const query = [condition, ...genes].filter(Boolean).join(" ");

    const map = new Map<string, TrialRow>();
    if (countries.length === 0) {
      const rows = await fetchTrials({ condition: query, phase, status });
      rows.forEach((r) => map.set(r.id, r));
    } else {
      for (const c of countries) {
        const rows = await fetchTrials({ condition: query, phase, status, country: c });
        rows.forEach((r) => map.set(r.id, r));
      }
    }

    return NextResponse.json({ trials: Array.from(map.values()) });
  } catch (err: any) {
    console.error("[API] /api/trials/search error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch trials" },
      { status: 500 }
    );
  }
}
