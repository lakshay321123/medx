import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { summarizeLabObservations, ObservationRow } from "@/lib/labs/summary";

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
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("observations")
      .select("kind,value_num,unit,observed_at,created_at,thread_id,report_id")
      .eq("user_id", userId)
      .not("value_num", "is", null)
      .order("observed_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as ObservationRow[];
    const dayKey = (iso?: string) => {
      const d = iso ? new Date(iso) : null;
      return d && !Number.isNaN(+d)
        ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10)
        : null;
    };
    const keys = new Set<string>();
    for (const r of rows) {
      const k = (r as any).report_id ?? dayKey((r as any).observed_at) ?? null;
      if (k) keys.add(k);
    }
    const totalReports = keys.size;

    const { trend, points } = summarizeLabObservations(rows, { tests, from, to });

    return NextResponse.json({
      ok: true,
      trend,
      meta: {
        source: "observations",
        points,
        total_reports: totalReports,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
