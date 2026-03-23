export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json().catch(() => ({}));
  if (!currentPassword || !newPassword) return NextResponse.json({ error: "Both passwords required" }, { status: 400 });
  if (newPassword.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  // TODO: When real auth is implemented, verify currentPassword against stored hash
  // For now, return success stub
  return NextResponse.json({ ok: true, message: "Password updated. (Auth system not yet configured)" });
}
