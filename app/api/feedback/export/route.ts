import { NextResponse } from "next/server";
import { exportPendingFeedbackToOpenAI } from "@/lib/feedback/exporter";

export const runtime = "nodejs"; // needs fs for temp file

export async function POST() {
  try {
    const { uploaded, fileId } = await exportPendingFeedbackToOpenAI();
    return NextResponse.json({ ok: true, uploaded, fileId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "export_failed" }, { status: 500 });
  }
}

// optional: GET for manual testing
export async function GET() {
  return POST();
}
