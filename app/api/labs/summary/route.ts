import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { fetchLabSummary } from "@/lib/labs/summary";

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const testsParam = url.searchParams.get("tests");
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;
  const tests = testsParam
    ? testsParam
        .split(",")
        .map((code) => code.trim())
        .filter(Boolean)
    : undefined;

  try {
    const { trend, meta } = await fetchLabSummary(supabaseAdmin(), {
      userId,
      tests,
      from,
      to,
    });
    return NextResponse.json({ ok: true, trend, meta });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
