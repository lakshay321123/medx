import { supabaseAdmin } from "@/lib/supabase/admin";

export type AidocIntent =
  | { kind: "pull_reports" }
  | { kind: "compare_reports" }
  | { kind: "overall_health" }
  | { kind: "compare_metric"; metric: string }
  | { kind: "none" };

const PULL_RE = /\b(pull|show|list|fetch)\s+(all\s+)?(my\s+)?report(s)?\b/i;
const COMPARE_RE = /\b(compare|contrast)\s+(all\s+)?(my\s+)?report(s)?\b/i;
const OVERALL_RE = /\b(how('?s|\s+is)\s+my\s+health(\s+overall)?|overall\s+health|health\s+overall)\b/i;

const METRIC_WORDS: Record<string, string[]> = {
  LDL: ["ldl", "ldl-c", "low density lipoprotein"],
  HbA1c: ["hba1c", "a1c", "glycated hemoglobin", "glycosylated hemoglobin"],
  "ALT (SGPT)": ["alt", "sgpt"],
  "AST (SGOT)": ["ast", "sgot"],
  HDL: ["hdl", "hdl-c"],
  Triglycerides: ["tg", "triglycerides", "triglyceride"],
  "Total Cholesterol": ["tc", "total cholesterol", "cholesterol total"],
  "Fasting Glucose": ["fbg", "fasting glucose", "fasting blood sugar"],
};

export function detectAidocIntent(text: string): AidocIntent {
  const s = (text || "").trim();
  if (!s) return { kind: "none" };
  if (PULL_RE.test(s)) return { kind: "pull_reports" };
  if (COMPARE_RE.test(s)) return { kind: "compare_reports" };
  if (OVERALL_RE.test(s)) return { kind: "overall_health" };
  if (/\bcompare\b/i.test(s)) {
    const lower = s.toLowerCase();
    for (const [canon, aliases] of Object.entries(METRIC_WORDS)) {
      if (aliases.some((alias) => lower.includes(alias))) {
        return { kind: "compare_metric", metric: canon };
      }
    }
  }
  return { kind: "none" };
}

export function latestAidocUserText(body: any): string {
  if (body && typeof body.message === "string" && body.message.trim()) {
    return body.message.trim();
  }
  if (body && typeof body.text === "string" && body.text.trim()) {
    return body.text.trim();
  }
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg && msg.role === "user" && typeof msg.content === "string") {
      return msg.content.trim();
    }
  }
  return "";
}

function canonName(name: string): string {
  const n = (name || "").toLowerCase();
  if (n === "ldl-c") return "LDL";
  if (n === "hdl-c") return "HDL";
  if (/^alt(\s|\()/.test(name)) return "ALT (SGPT)";
  if (/^ast(\s|\()/.test(name)) return "AST (SGOT)";
  if (/^tc$|total cholesterol/.test(n)) return "Total Cholesterol";
  if (/^tg$|triglyceride/.test(n)) return "Triglycerides";
  if (/^fbg$|fasting glucose|fasting blood sugar/.test(n)) return "Fasting Glucose";
  return name;
}

export type HiStatus = "high" | "low" | "normal" | "ok" | "unknown";
export type Hi = { name: string; value: number | string | null; unit: string | null; status: HiStatus };
export type MetricSeriesPoint = { date: string; value: number | null; unit: string | null; status: string };

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeUnit(unit: unknown): string | null {
  if (typeof unit === "string") {
    const trimmed = unit.trim();
    return trimmed ? trimmed : null;
  }
  return null;
}

function statusFor(
  value: number | null,
  lo?: number | null,
  hi?: number | null,
  polarity: "lower" | "higher" | "neutral" = "neutral",
): HiStatus {
  if (value == null) return "unknown";
  if (lo != null && value < lo) return "low";
  if (hi != null && value > hi) return "high";
  if (polarity === "higher") return "ok";
  return "normal";
}

function shortLine(highs: Hi[]): string {
  const get = (n: string) => highs.find((h) => canonName(h.name) === n);
  const ldl = get("LDL");
  const tc = get("Total Cholesterol");
  const alt = get("ALT (SGPT)");
  const ast = get("AST (SGOT)");
  const fbg = get("Fasting Glucose");
  const bits: string[] = [];
  if (ldl?.status === "high" || tc?.status === "high") bits.push("Cholesterol high");
  if (alt?.status === "high" || ast?.status === "high") bits.push("liver enzymes high");
  if (fbg && (fbg.status === "normal" || fbg.status === "ok")) bits.push("glucose normal");
  if (!bits.length) bits.push("No strong signals");
  const line = bits.join("; ");
  return line.charAt(0).toUpperCase() + line.slice(1) + ".";
}

export function markdownSnapshot(byDate: Record<string, Hi[]>): string {
  const dates = Object.keys(byDate).sort().reverse();
  const out: string[] = ["## Patient Snapshot"];
  if (!dates.length) {
    out.push("_No lab values found yet._", "");
  }
  if (dates.length) {
    out.push(shortLine(byDate[dates[0]]), "");
  }
  for (const d of dates) {
    const highs = byDate[d];
    out.push(`**${d}** — ${shortLine(highs)}`);
    const chips = highs
      .slice(0, 6)
      .map((h) => `\`${h.name}: ${h.value ?? "—"}${h.unit ? ` ${h.unit}` : ""} (${h.status})\``)
      .join(" • ");
    if (chips) out.push(chips);
    if (highs.length > 6) out.push(`_${highs.length - 6} more_`);
    out.push("");
  }
  out.push(
    "**What to do next**",
    "- Repeat any stale/missing key panels as advised by your clinician.",
    "- Discuss abnormal results and targets (e.g., LDL) with your clinician.",
    "- Keep steady activity and a fiber-forward diet for cardiometabolic support.",
  );
  return out.join("\n");
}

export function markdownMetric(metric: string, series: MetricSeriesPoint[]): string {
  const out = [`## Compare ${metric}`];
  if (!series.length) {
    out.push("_No values found yet. Add a report that includes this test._");
    return out.join("\n");
  }
  for (const point of series) {
    const valueStr = point.value == null ? "—" : String(point.value);
    const unitStr = point.unit ? ` ${point.unit}` : "";
    out.push(`- ${point.date} — **${valueStr}${unitStr}** (_${point.status}_)`);
  }
  if (series.length < 2) {
    out.push("\n_Need ≥2 results to assess trend._");
  }
  return out.join("\n");
}

export async function loadAidocSnapshot(userId: string, limit = 365): Promise<{
  snapshot: Record<string, Hi[]>;
  seriesByMetric: Record<string, MetricSeriesPoint[]>;
}> {
  const client = supabaseAdmin();
  const { data, error } = await client
    .from("observations")
    .select("*")
    .eq("user_id", userId)
    .not("value_num", "is", null)
    .order("observed_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const rows = Array.isArray(data) ? (data as any[]) : [];
  const byDateRaw: Record<string, any[]> = {};
  for (const row of rows) {
    const iso: string =
      row?.observed_at ||
      row?.taken_at ||
      row?.takenAt ||
      row?.sample_date ||
      row?.sampleDate ||
      "";
    const date = typeof iso === "string" && iso.length >= 10 ? iso.slice(0, 10) : "";
    if (!date) continue;
    (byDateRaw[date] = byDateRaw[date] || []).push(row);
  }

  const snapshot: Record<string, Hi[]> = {};
  const seriesMap = new Map<string, MetricSeriesPoint[]>();

  for (const [date, rowsForDate] of Object.entries(byDateRaw)) {
    const seenDocRow = new Set<string>();
    const filtered = rowsForDate.filter((row: any) => {
      const docId =
        row?.document_id ||
        row?.doc_id ||
        row?.docId ||
        row?.report_id ||
        row?.thread_id ||
        date;
      const rawName = String(
        row?.test_code ?? row?.test_name ?? row?.name ?? row?.kind ?? "?",
      ).toLowerCase();
      const key = `${docId}:${rawName}`;
      if (seenDocRow.has(key)) return false;
      seenDocRow.add(key);
      return true;
    });

    const perTest: Record<string, { highlight: Hi; ts: number; numeric: number | null }> = {};
    for (const row of filtered) {
      const raw = String(row?.test_name ?? row?.name ?? row?.kind ?? row?.test_code ?? "");
      const canonical = canonName(raw);
      if (!canonical) continue;
      const valueNumeric = toNumber(row?.value_num ?? row?.value);
      const displayValue: number | string | null =
        typeof row?.value_num === "number"
          ? row.value_num
          : row?.value ?? (valueNumeric != null ? valueNumeric : null);
      const unit = normalizeUnit(row?.unit);
      const lo = toNumber(row?.ref_low ?? row?.refLow ?? row?.reference_low ?? row?.low);
      const hi = toNumber(row?.ref_high ?? row?.refHigh ?? row?.reference_high ?? row?.high);
      const polarity: "lower" | "higher" | "neutral" =
        /ldl|tc|triglyceride|tg|alt|ast|alp|crp|esr/i.test(canonical)
          ? "lower"
          : /hdl/i.test(canonical)
          ? "higher"
          : "neutral";
      const status = lo != null || hi != null ? statusFor(valueNumeric, lo, hi, polarity) : "unknown";
      const tsRaw =
        row?.observed_at ||
        row?.taken_at ||
        row?.takenAt ||
        row?.sample_date ||
        row?.sampleDate ||
        date;
      const tsParsed = typeof tsRaw === "string" ? Date.parse(tsRaw) : Number(tsRaw);
      const ts = Number.isFinite(tsParsed) ? tsParsed : Date.parse(`${date}T00:00:00Z`);
      const existing = perTest[canonical];
      if (!existing || ts >= existing.ts) {
        perTest[canonical] = {
          highlight: { name: canonical, value: displayValue, unit, status },
          ts,
          numeric: valueNumeric,
        };
      }
    }

    const highlights = Object.values(perTest)
      .sort((a, b) => a.highlight.name.localeCompare(b.highlight.name))
      .map((entry) => entry.highlight);
    snapshot[date] = highlights;

    for (const entry of Object.values(perTest)) {
      const arr = seriesMap.get(entry.highlight.name) || [];
      arr.push({
        date,
        value: entry.numeric,
        unit: entry.highlight.unit,
        status: entry.highlight.status,
      });
      seriesMap.set(entry.highlight.name, arr);
    }
  }

  const seriesByMetric: Record<string, MetricSeriesPoint[]> = {};
  for (const [metric, points] of seriesMap.entries()) {
    points.sort((a, b) => a.date.localeCompare(b.date));
    seriesByMetric[metric] = points;
  }

  return { snapshot, seriesByMetric };
}
