export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getChronicMedEducation } from "@/lib/meds/chronic";

const ENABLED = (process.env.CHRONIC_MED_EDU || "").toLowerCase() === "true";

export async function POST(req: NextRequest) {
  if (!ENABLED) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  const { meds } = await req.json().catch(() => ({ meds: [] }));
  const list = Array.isArray(meds) ? meds.map((m) => String(m)) : [];
  if (list.length === 0) {
    return NextResponse.json({ error: "meds_required" }, { status: 400 });
  }
  const total = list.length;
  const data = await getChronicMedEducation(list);
  const normalized = data.chronicMeds.length;
  const rate = total ? normalized / total : 0;
  console.log("chronic_med_edu", { requested: total, normalized, success_rate: rate });
  return NextResponse.json({
    chronicMeds: data.chronicMeds,
    skipped: data.skipped,
    note: "Ask a clinician about interactions.",
  });
}
