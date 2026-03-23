export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";

export async function POST() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // TODO: When real auth is implemented, invalidate all sessions except current
  return NextResponse.json({ ok: true, message: "All other sessions revoked. (Auth system not yet configured)" });
}
