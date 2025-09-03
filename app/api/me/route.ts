export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/local-session";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}
