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
    const grouped = trend.reduce<Record<string, typeof trend[number]["series"]>>((acc, item) => {
      acc[item.test_code] = item.series;
      return acc;
    }, {});
    return NextResponse.json({
      ok: true,
      trend,
      meta: {
        source: "observations",
        kinds_seen: Object.keys(grouped).length,
        total_points: Object.values(grouped).reduce((sum, rows) => sum + rows.length, 0),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed to load labs";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
