export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { runAidocRecompute } from "@/app/api/ai-doc/recompute/route";

export async function POST() {
  try {
    await runAidocRecompute();
    return NextResponse.json({ ok: true, forwarded: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
