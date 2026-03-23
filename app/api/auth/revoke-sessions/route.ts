export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";

export async function POST() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // TODO: When real auth is implemented, invalidate all sessions except current
  return NextResponse.json({ error: "Session revocation not yet available. Auth system coming soon." }, { status: 501 });
}
