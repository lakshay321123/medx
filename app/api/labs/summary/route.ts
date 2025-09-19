import { NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { fetchLabsTrend } from "@/lib/labs/trend";

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const trend = await fetchLabsTrend({ userId });
    return NextResponse.json({ ok: true, trend });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed to load labs";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
