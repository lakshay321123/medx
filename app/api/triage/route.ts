import { NextRequest, NextResponse } from "next/server";
import { symptomTriageFinal } from "@/lib/triage";
import { ensureMinDelay } from "@/lib/utils/ensureMinDelay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const work = symptomTriageFinal({
      symptom: (body?.symptom || "").trim(),
      age: body?.age,
      durationDays: body?.durationDays,
      flags: Array.isArray(body?.flags) ? body.flags : undefined,
    });
    const triage = await ensureMinDelay(work);
    return NextResponse.json({ ok: true, ...triage });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: String(e?.message||e) }, { status: 400 });
  }
}
