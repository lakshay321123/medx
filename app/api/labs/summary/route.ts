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
      .select("kind,value_num,unit,observed_at,thread_id,report_id")
      .eq("user_id", userId)
      .not("value_num", "is", null)
      .order("observed_at", { ascending: false })
      .limit(5000);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as ObservationRow[];

    const reportKey = (row: ObservationRow): string | null => {
      if (row.report_id) return row.report_id;
      if (row.thread_id) return row.thread_id;

      const iso = row.observed_at;
      if (!iso) return null;

      const parsed = new Date(iso);
      if (Number.isNaN(parsed.getTime())) return null;

      const day = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      return day.toISOString();
    };

    const allReportKeys = new Set<string>();
    for (const row of rows) {
      const key = reportKey(row);
      if (key) allReportKeys.add(key);
    }

    const totalReports = allReportKeys.size;

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
