import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

type CanonicalLab = {
  code: string;
  name: string;
  better: "lower" | "higher" | null;
};

const LAB_KINDS: Record<string, CanonicalLab> = {
  ldl: { code: "LDL-C", name: "LDL Cholesterol", better: "lower" },
  ldl_cholesterol: { code: "LDL-C", name: "LDL Cholesterol", better: "lower" },
  hdl: { code: "HDL-C", name: "HDL Cholesterol", better: "higher" },
  hdl_cholesterol: { code: "HDL-C", name: "HDL Cholesterol", better: "higher" },
  triglycerides: { code: "TG", name: "Triglycerides", better: "lower" },
  tg: { code: "TG", name: "Triglycerides", better: "lower" },
  total_cholesterol: { code: "TC", name: "Total Cholesterol", better: "lower" },
  cholesterol: { code: "TC", name: "Total Cholesterol", better: "lower" },
  cholesterol_total: { code: "TC", name: "Total Cholesterol", better: "lower" },
  hba1c: { code: "HBA1C", name: "HbA1c", better: "lower" },
  crp: { code: "CRP", name: "C-reactive protein", better: "lower" },
  c_reactive_protein: { code: "CRP", name: "C-reactive protein", better: "lower" },
  esr: { code: "ESR", name: "ESR", better: "lower" },
  vitamin_d: { code: "VITD", name: "Vitamin D (25-OH)", better: "higher" },
  vitamin_d_25_oh: { code: "VITD", name: "Vitamin D (25-OH)", better: "higher" },
  vitd: { code: "VITD", name: "Vitamin D (25-OH)", better: "higher" },
  "25_oh_vitamin_d": { code: "VITD", name: "Vitamin D (25-OH)", better: "higher" },
  uibc: { code: "UIBC", name: "UIBC", better: null },
  unsaturated_iron_binding_capacity: { code: "UIBC", name: "UIBC", better: null },
  sgpt: { code: "ALT", name: "ALT (SGPT)", better: "lower" },
  alt: { code: "ALT", name: "ALT (SGPT)", better: "lower" },
  sgot: { code: "AST", name: "AST (SGOT)", better: "lower" },
  ast: { code: "AST", name: "AST (SGOT)", better: "lower" },
};

type ObservationRow = {
  kind: string;
  value_num: number | string | null;
  unit: string | null;
  observed_at: string | null;
  created_at: string | null;
};

type TrendPoint = {
  value: number | null;
  unit: string | null;
  sample_date: string | null;
};

type TrendItem = {
  test_code: string;
  test_name: string;
  unit: string | null;
  better: CanonicalLab["better"];
  latest: TrendPoint | null;
  previous: TrendPoint | null;
  direction: "improving" | "worsening" | "flat" | "unknown";
  series: TrendPoint[];
};

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const kinds = Object.keys(LAB_KINDS);
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("observations")
    .select("kind,value_num,unit,observed_at,created_at")
    .eq("user_id", userId)
    .in("kind", kinds)
    .order("observed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(1000);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const grouped: Record<string, TrendItem> = {};

  for (const row of data ?? []) {
    const canonical = LAB_KINDS[row.kind];
    if (!canonical) continue;
    const rawDate = row.observed_at || row.created_at || null;
    let sampleDate: string | null = null;
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!Number.isNaN(parsed.getTime())) {
        sampleDate = parsed.toISOString();
      }
    }
    const numericValue =
      typeof row.value_num === "number"
        ? row.value_num
        : row.value_num != null
          ? Number(row.value_num)
          : null;

    const point: TrendPoint = {
      value: Number.isFinite(numericValue) ? Number(numericValue) : null,
      unit: row.unit,
      sample_date: sampleDate,
    };

    if (!grouped[canonical.code]) {
      grouped[canonical.code] = {
        test_code: canonical.code,
        test_name: canonical.name,
        unit: row.unit,
        better: canonical.better,
        latest: null,
        previous: null,
        direction: "unknown",
        series: [],
      };
    }

    if (row.unit && !grouped[canonical.code].unit) {
      grouped[canonical.code].unit = row.unit;
    }

    grouped[canonical.code].series.push(point);
  }

  const trend: TrendItem[] = Object.values(grouped).map(item => {
    const sortedSeries = [...item.series].sort((a, b) => {
      const timeA = a.sample_date ? new Date(a.sample_date).getTime() : -Infinity;
      const timeB = b.sample_date ? new Date(b.sample_date).getTime() : -Infinity;
      return timeB - timeA;
    });

    const latest = sortedSeries[0] ?? null;
    const previous = sortedSeries[1] ?? null;
    let direction: TrendItem["direction"] = "unknown";
    if (latest?.value != null && previous?.value != null) {
      const diff = latest.value - previous.value;
      if (Math.abs(diff) < 1e-9) {
        direction = "flat";
      } else if (item.better === "lower") {
        direction = diff < 0 ? "improving" : "worsening";
      } else if (item.better === "higher") {
        direction = diff > 0 ? "improving" : "worsening";
      }
    }

    return {
      ...item,
      unit: latest?.unit ?? item.unit ?? null,
      latest,
      previous,
      direction,
      series: sortedSeries,
    };
  });

  trend.sort((a, b) => {
    const timeA = a.latest?.sample_date ? new Date(a.latest.sample_date).getTime() : -Infinity;
    const timeB = b.latest?.sample_date ? new Date(b.latest.sample_date).getTime() : -Infinity;
    return timeB - timeA;
  });

  return NextResponse.json({ ok: true, trend });
}
