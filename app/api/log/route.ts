export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const data = await req.json();
  try {
    if (prisma && typeof (prisma as any).chatEvent?.create === "function") {
      await (prisma as any).chatEvent.create({ data });
    } else {
      console.warn("[log] prisma chatEvent.create unavailable; skipping");
    }
  } catch (err) {
    console.error("[log] failed to persist chat event", err);
    return NextResponse.json({ ok: false, error: "failed_to_log" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
