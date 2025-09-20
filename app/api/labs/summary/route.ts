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
      .select("kind,value_num,unit,observed_at,report_id")
      .eq("user_id", userId)
      .not("value_num", "is", null)
      .order("observed_at", { ascending: false })
      .limit(5000);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as ObservationRow[];
    const { trend } = summarizeLabObservations(rows, { tests, from, to });

    const reportKeys = new Set<string>();
    for (const row of rows) {
      const observed = row.observed_at ? new Date(row.observed_at) : null;
      const day = observed && !Number.isNaN(+observed)
        ? new Date(observed.getFullYear(), observed.getMonth(), observed.getDate())
            .toISOString()
            .slice(0, 10)
        : null;
      const key = row.report_id ?? day;
      if (key) reportKeys.add(key);
    }
    const totalReports = reportKeys.size;

    return NextResponse.json({
      ok: true,
      trend,
      meta: {
        total_reports: totalReports,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
