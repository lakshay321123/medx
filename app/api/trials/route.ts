import { NextRequest, NextResponse } from "next/server";
import { fetchTrials } from "@/lib/trials";

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
    const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize") || "25")));
    const min = (page - 1) * pageSize + 1;
    const max = page * pageSize;

    const rows = await fetchTrials({ condition, country, city, status, phase, min, max });
    return NextResponse.json({ rows, page, pageSize });
  } catch (e) {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}
