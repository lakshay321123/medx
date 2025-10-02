import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { fetchLabSummary, ObservationRow } from "@/lib/labs/summary";

const PULL_RE = /\b(pull|show|list|fetch)\s+(all\s+)?(my\s+)?report(s)?\b/i;
const COMPARE_RE = /\b(compare|contrast)\s+(all\s+)?(my\s+)?report(s)?\b/i;
const OVERALL_RE = /\b(how('?s|\s+is)\s+my\s+health(\s+overall)?|overall\s+health|health\s+overall)\b/i;

const METRIC: Record<string, string[]> = {
  LDL: ["ldl", "ldl-c", "low density lipoprotein"],
  HbA1c: ["hba1c", "a1c", "glycated hemoglobin", "glycosylated hemoglobin"],
  "ALT (SGPT)": ["alt", "sgpt"],
  "AST (SGOT)": ["ast", "sgot"],
  HDL: ["hdl", "hdl-c"],
  Triglycerides: ["tg", "triglycerides", "triglyceride"],
  "Total Cholesterol": ["tc", "total cholesterol", "cholesterol total"],
  "Fasting Glucose": ["fbg", "fasting glucose", "fasting blood sugar"],
};

const canon = (raw: string): string => {
  const n = (raw || "").trim();
  const s = n.toLowerCase();
  if (s === "ldl-c") return "LDL";
  if (s === "hdl-c") return "HDL";
  if (/^alt(\s|\()/i.test(n)) return "ALT (SGPT)";
  if (/^ast(\s|\()/i.test(n)) return "AST (SGOT)";
  if (/^tc$|total cholesterol/i.test(n)) return "Total Cholesterol";
  if (/^tg$|triglyceride/i.test(n)) return "Triglycerides";
  if (/^fbg$|fasting glucose|fasting blood sugar/i.test(n)) return "Fasting Glucose";
  return n;
};

type ValueStatus = "high" | "low" | "normal" | "ok" | "unknown";

type SnapshotRow = {
  name: string;
  value: number | string | null;
  unit: string | null;
  status: ValueStatus;
};

const statusFor = (
  value: number | null,
  lo?: number | null,
  hi?: number | null,
  polarity: "lower" | "higher" | "neutral" = "neutral",
): ValueStatus => {
  if (value == null) return "unknown";
  if (lo != null && value < lo) return "low";
  if (hi != null && value > hi) return "high";
  if (polarity === "higher") return "ok";
  return "normal";
};

const shortLine = (rows: SnapshotRow[]): string => {
  const find = (name: string) => rows.find(r => canon(r.name) === name);
  const bits: string[] = [];
  const ldl = find("LDL");
  const tc = find("Total Cholesterol");
  const alt = find("ALT (SGPT)");
  const ast = find("AST (SGOT)");
  const fbg = find("Fasting Glucose");
  if (ldl?.status === "high" || tc?.status === "high") bits.push("Cholesterol high");
  if (alt?.status === "high" || ast?.status === "high") bits.push("liver enzymes high");
  if (fbg && (fbg.status === "normal" || fbg.status === "ok")) bits.push("glucose normal");
  if (!bits.length) return "No strong signals.";
  const sentence = bits.join("; ");
  return sentence.replace(/^./, c => c.toUpperCase()) + ".";
};

const mdSnapshot = (byDate: Record<string, SnapshotRow[]>): string => {
  const dates = Object.keys(byDate).sort().reverse();
  const out: string[] = ["## Patient Snapshot"];
  if (dates.length) {
    out.push(shortLine(byDate[dates[0]]));
    out.push("");
  }
  for (const date of dates) {
    const rows = byDate[date];
    const summary = shortLine(rows);
    out.push(`**${date}** — ${summary}`);
    const chips = rows
      .slice(0, 6)
      .map(row => {
        const value = row.value ?? "—";
        const unit = row.unit ? ` ${row.unit}` : "";
        return `\`${row.name}: ${value}${unit} (${row.status})\``;
      })
      .join(" • ");
    if (chips) out.push(chips);
    if (rows.length > 6) out.push(`_+${rows.length - 6} more_`);
    out.push("");
  }
  out.push(
    "**What to do next**",
    "- Repeat stale/missing key panels as advised.",
    "- Discuss abnormal targets (e.g., LDL).",
    "- Keep steady activity and a fiber-forward diet.",
  );
  return out.join("\n");
};

const mdMetric = (
  metric: string,
  series: Array<{ date: string; value: number | null; unit: string | null; status: ValueStatus }>,
): string => {
  const out: string[] = [`## Compare ${metric}`];
  if (!series.length) {
    out.push("_No values yet. Add a report with this test._");
    return out.join("\n");
  }
  for (const point of series) {
    const value = point.value ?? "—";
    const unit = point.unit ? ` ${point.unit}` : "";
    out.push(`- ${point.date} — **${value}${unit}** (_${point.status}_)`);
  }
  if (series.length < 2) {
    out.push("\n_Need ≥2 results to assess trend._");
  }
  return out.join("\n");
};

const polarityFor = (name: string): "lower" | "higher" | "neutral" => {
  if (/ldl|tc|triglyceride|tg|alt|ast|alp|crp|esr/i.test(name)) return "lower";
  if (/hdl/i.test(name)) return "higher";
  return "neutral";
};

const valueFromRow = (row: ObservationRow): number | string | null => {
  if (typeof row.value_num === "number") return row.value_num;
  if (typeof (row as any).valueNum === "number") return (row as any).valueNum as number;
  if (typeof row.value === "number") return row.value;
  if (typeof row.value === "string" && row.value.trim()) return row.value;
  if (typeof row.value_text === "string" && row.value_text.trim()) return row.value_text;
  if (typeof (row as any).valueText === "string" && (row as any).valueText.trim()) return (row as any).valueText as string;
  return null;
};

const unitFromRow = (row: ObservationRow): string | null => {
  const unit = row.unit ?? (row.unit_text as string | undefined) ?? (row.unitText as string | undefined);
  if (typeof unit === "string" && unit.trim()) return unit.trim();
  return null;
};

const refLowFromRow = (row: ObservationRow): number | null => {
  const candidates = [row.ref_low, row.refLow, row.normal_low, row.normalLow];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
};

const refHighFromRow = (row: ObservationRow): number | null => {
  const candidates = [row.ref_high, row.refHigh, row.normal_high, row.normalHigh];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
};

const timestampFromRow = (row: ObservationRow, fallbackDate: string): number => {
  const raw =
    row.observed_at ||
    row.taken_at ||
    row.takenAt ||
    (typeof (row as any).observedAt === "string" ? ((row as any).observedAt as string) : null) ||
    fallbackDate;
  const ts = Date.parse(raw ?? fallbackDate);
  return Number.isFinite(ts) ? ts : Date.parse(fallbackDate);
};

type SnapshotContext = {
  message: string;
  threadType?: string | null;
  threadId?: string | null;
  mode?: string | null;
};

export async function maybeHandleAidocSnapshot(
  req: NextRequest,
  context: SnapshotContext,
): Promise<NextResponse | null> {
  const message = (context.message || "").toString();
  if (!message.trim()) return null;

  const threadType = (context.threadType || "").toString().toLowerCase();
  const threadId = (context.threadId || "").toString().toLowerCase();
  const mode = (context.mode || "").toString().toLowerCase();

  const isAidoc =
    threadType === "aidoc" ||
    mode === "aidoc" ||
    (threadId ? threadId.startsWith("aidoc") : false);

  if (!isAidoc) return null;

  const lower = message.toLowerCase();
  const isPull = PULL_RE.test(lower);
  const isCompareAll = COMPARE_RE.test(lower);
  const isOverall = OVERALL_RE.test(lower);

  let metricCanon: string | null = null;
  if (/\bcompare\b/.test(lower)) {
    for (const [canonName, aliases] of Object.entries(METRIC)) {
      if (aliases.some(alias => lower.includes(alias))) {
        metricCanon = canonName;
        break;
      }
    }
  }

  if (!(isPull || isCompareAll || isOverall || metricCanon)) {
    return null;
  }

  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({
      role: "assistant",
      content: "Please sign in to view your reports.",
    });
  }

  try {
    const summary = await fetchLabSummary({ userId, limit: 365 });
    const rows = Array.isArray(summary?.points) ? summary.points : [];

    const grouped: Record<string, ObservationRow[]> = {};
    for (const row of rows) {
      const rawDate =
        (typeof row.taken_at === "string" && row.taken_at) ||
        (typeof row.takenAt === "string" && row.takenAt) ||
        (typeof row.observed_at === "string" && row.observed_at) ||
        (typeof (row as any).observedAt === "string" ? ((row as any).observedAt as string) : null);
      if (!rawDate) continue;
      const day = rawDate.slice(0, 10);
      if (!day) continue;
      (grouped[day] = grouped[day] || []).push(row);
    }

    const byDate: Record<string, SnapshotRow[]> = {};
    for (const [date, bucket] of Object.entries(grouped)) {
      const seenPairs = new Set<string>();
      const filtered = bucket.filter(row => {
        const docId =
          (typeof row.document_id === "string" && row.document_id) ||
          (typeof row.doc_id === "string" && row.doc_id) ||
          (typeof row.documentId === "string" && row.documentId) ||
          "x";
        const testKey =
          (typeof row.test_code === "string" && row.test_code) ||
          (typeof row.test_name === "string" && row.test_name) ||
          (typeof row.name === "string" && row.name) ||
          (typeof (row as any).testName === "string" ? ((row as any).testName as string) : "?");
        const key = `${docId}:${testKey}`;
        if (seenPairs.has(key)) return false;
        seenPairs.add(key);
        return true;
      });

      const perTest = new Map<string, { row: SnapshotRow; ts: number }>();
      for (const row of filtered) {
        const rawName =
          (typeof row.test_name === "string" && row.test_name) ||
          (typeof row.name === "string" && row.name) ||
          (typeof (row as any).testName === "string" ? ((row as any).testName as string) : row.kind) ||
          "";
        const canonicalName = canon(rawName);

        const rawValue = valueFromRow(row);
        const numericValue =
          typeof rawValue === "number"
            ? rawValue
            : typeof rawValue === "string" && rawValue.trim() && !Number.isNaN(Number(rawValue))
            ? Number(rawValue)
            : null;
        const displayValue = numericValue ?? rawValue;

        const unit = unitFromRow(row);
        const lo = refLowFromRow(row);
        const hi = refHighFromRow(row);
        const polarity = polarityFor(canonicalName);
        const status = lo != null || hi != null ? statusFor(numericValue, lo, hi, polarity) : "unknown";
        const ts = timestampFromRow(row, date);

        const existing = perTest.get(canonicalName);
        if (!existing || ts >= existing.ts) {
          perTest.set(canonicalName, {
            row: { name: canonicalName || rawName || row.kind, value: displayValue, unit, status },
            ts,
          });
        }
      }

      byDate[date] = Array.from(perTest.values()).map(entry => entry.row);
    }

    if (metricCanon) {
      const series: Array<{ date: string; value: number | null; unit: string | null; status: ValueStatus }> = [];
      for (const [date, rowsByDate] of Object.entries(byDate)) {
        const match = rowsByDate.find(row => canon(row.name) === metricCanon);
        if (!match) continue;
        let numeric: number | null = null;
        if (typeof match.value === "number") {
          numeric = match.value;
        } else if (typeof match.value === "string" && match.value.trim() && !Number.isNaN(Number(match.value))) {
          numeric = Number(match.value);
        }
        series.push({ date, value: numeric, unit: match.unit, status: match.status });
      }
      series.sort((a, b) => a.date.localeCompare(b.date));
      return NextResponse.json({
        role: "assistant",
        content: mdMetric(metricCanon, series),
      });
    }

    return NextResponse.json({
      role: "assistant",
      content: mdSnapshot(byDate),
    });
  } catch (error) {
    console.error("AIDOC snapshot failed", error);
    return NextResponse.json({
      role: "assistant",
      content: "## Patient Snapshot\nCould not read labs right now. Try again shortly.",
    });
  }
}
