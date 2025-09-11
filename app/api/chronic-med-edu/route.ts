export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { chronicMedEducation, CHRONIC_MED_EDU_ENABLED } from "@/lib/meds/chronicEdu";

export async function POST(req: NextRequest) {
  if (!CHRONIC_MED_EDU_ENABLED) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  try {
    const body = await req.json();
    const meds = Array.isArray(body?.meds) ? body.meds.map((m: any) => String(m)) : [];
    if (meds.length === 0) {
      return NextResponse.json({ error: "meds_required" }, { status: 400 });
    }
    const data = chronicMedEducation(meds);
    const response: any = {
      chronicMeds: data.chronicMeds,
      interactionWarning: data.interactionWarning,
    };
    if (data.unrecognized.length) {
      response.unrecognized = data.unrecognized;
    }
    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
}
