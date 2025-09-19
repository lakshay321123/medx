import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { fetchLabsTrend } from "@/lib/labs/trend";

export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const rawTests = searchParams.getAll("tests");
    const parsedTests = new Set<string>();
    for (const entry of rawTests) {
      if (!entry) continue;
      entry
        .split(",")
        .map(token => token.trim())
        .filter(Boolean)
        .forEach(token => parsedTests.add(token.toUpperCase()));
    }

    const fromParam = searchParams.get("from") ?? undefined;
    const toParam = searchParams.get("to") ?? undefined;

    const from = fromParam && !Number.isNaN(Date.parse(fromParam)) ? fromParam : undefined;
    const to = toParam && !Number.isNaN(Date.parse(toParam)) ? toParam : undefined;

    const trend = await fetchLabsTrend({
      userId,
      tests: parsedTests.size ? Array.from(parsedTests) : undefined,
      from,
      to,
    });

    return NextResponse.json({
      ok: true,
      trend,
      meta: {
        source: "observations",
        points: trend.reduce((sum, item) => sum + item.series.length, 0),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed to load labs";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
