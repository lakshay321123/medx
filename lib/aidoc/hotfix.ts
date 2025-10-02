import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function HF_enabled() {
  return process.env.AIDOC_FORCE_INTERCEPT === "1";
}

const PULL_RE     = /\b(pull|show|list|fetch)\s+(all\s+)?(my\s+)?report(s)?\b/i;
const COMPARE_RE  = /\b(compare|contrast)\s+(all\s+)?(my\s+)?report(s)?\b/i;
const OVERALL_RE  = /\b(how('?s|\s+is)\s+my\s+health(\s+overall)?|overall\s+health|health\s+overall)\b/i;

const METRIC: Record<string, string[]> = {
  "LDL": ["ldl", "ldl-c", "low density lipoprotein", "ldl cholesterol"],
  "HbA1c": ["hba1c", "a1c", "glycated hemoglobin", "glycosylated hemoglobin"],
  "ALT (SGPT)": ["alt", "sgpt"],
  "AST (SGOT)": ["ast", "sgot"],
  "HDL": ["hdl", "hdl-c", "high density lipoprotein", "hdl cholesterol"],
  "Triglycerides": ["tg", "triglycerides", "triglyceride"],
  "Total Cholesterol": ["tc", "total cholesterol", "cholesterol total", "cholesterol"],
  "Fasting Glucose": ["fbg", "fasting glucose", "fasting blood sugar"],
};

const canon = (n: string) => {
  const raw = (n || "").trim();
  const s = raw.toLowerCase();
  if (s === "ldl" || s === "ldl-c" || s.includes("ldl cholesterol") || s.includes("low density lipoprotein")) {
    return "LDL";
  }
  if (s === "hdl" || s === "hdl-c" || s.includes("hdl cholesterol") || s.includes("high density lipoprotein")) {
    return "HDL";
  }
  if (/^alt(\s|\(|$)/i.test(raw)) return "ALT (SGPT)";
  if (/^ast(\s|\(|$)/i.test(raw)) return "AST (SGOT)";
  if (/^tc$/.test(s) || /total cholesterol/.test(s)) return "Total Cholesterol";
  if (/^tg$/.test(s) || /triglyceride/.test(s)) return "Triglycerides";
  if (s === "hba1c" || s === "a1c" || /glycated hemoglobin|glycosylated hemoglobin/.test(s)) return "HbA1c";
  if (s === "fbg" || /fasting glucose|fasting blood sugar/.test(s)) return "Fasting Glucose";
  return raw;
};

type Hi = { name: string; value: number | string | null; unit: string | null; status: "high" | "low" | "normal" | "ok" | "unknown" };

const statusFor = (
  v: number | null | undefined,
  lo?: number | null,
  hi?: number | null,
  pol?: "lower" | "higher" | "neutral",
): Hi["status"] => {
  if (v == null || Number.isNaN(v)) return "unknown";
  if (lo != null && v < lo) return "low";
  if (hi != null && v > hi) return "high";
  if (pol === "higher") return "ok";
  return "normal";
};

const shortLine = (hs: Hi[]) => {
  const get = (n: string) => hs.find((h) => canon(h.name) === n);
  const bits: string[] = [];
  const ldl = get("LDL");
  const tc = get("Total Cholesterol");
  const alt = get("ALT (SGPT)");
  const ast = get("AST (SGOT)");
  const fbg = get("Fasting Glucose");
  if (ldl?.status === "high" || tc?.status === "high") bits.push("Cholesterol high");
  if (alt?.status === "high" || ast?.status === "high") bits.push("liver enzymes high");
  if (fbg && (fbg.status === "normal" || fbg.status === "ok")) bits.push("glucose normal");
  return bits.length ? bits.join("; ").replace(/^./, (c) => c.toUpperCase()) + "." : "No strong signals.";
};

const mdSnapshot = (byDate: Record<string, Hi[]>) => {
  const dates = Object.keys(byDate).sort().reverse();
  const out = ["## Patient Snapshot"];
  if (dates.length) out.push(shortLine(byDate[dates[0]]) || "", "");
  for (const d of dates) {
    const hs = byDate[d];
    const mini = shortLine(hs);
    out.push(`**${d}** — ${mini}`);
    const chips = hs
      .slice(0, 6)
      .map((h) => `\`${h.name}: ${h.value ?? "—"}${h.unit ? ` ${h.unit}` : ""} (${h.status})\``)
      .join(" • ");
    if (chips) out.push(chips);
    if (hs.length > 6) out.push(`_+${hs.length - 6} more_`);
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
  series: Array<{ date: string; value: number | null; unit: string | null; status: string }>,
) => {
  const out = [`## Compare ${metric}`];
  if (!series.length) {
    out.push("_No values yet. Add a report with this test._");
    return out.join("\n");
  }
  for (const p of series) {
    out.push(`- ${p.date} — **${p.value ?? "—"}${p.unit ? " " + p.unit : ""}** (_${p.status}_)`);
  }
  if (series.length < 2) out.push("\n_Need ≥2 results to assess trend._");
  return out.join("\n");
};

type RawPoint = {
  iso: string;
  name: string;
  value: number | string | null;
  unit: string | null;
  lo: number | null;
  hi: number | null;
  status?: string | null;
  direction?: string | null;
};

const parseNumber = (input: unknown): number | null => {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string" && input.trim() !== "") {
    const n = Number.parseFloat(input);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const normalizeStatus = (
  value: number | null,
  lo: number | null,
  hi: number | null,
  direction: string | null | undefined,
  canonical: string,
): Hi["status"] => {
  const hasRange = lo != null || hi != null;
  const normDirection = direction === "higher" || direction === "lower" || direction === "neutral" ? direction : null;
  const fallbackDirection = () => {
    if (["LDL", "Total Cholesterol", "Triglycerides", "ALT (SGPT)", "AST (SGOT)", "Fasting Glucose"].includes(canonical)) {
      return "lower" as const;
    }
    if (canonical === "HDL") return "higher" as const;
    return "neutral" as const;
  };
  const polarity: "lower" | "higher" | "neutral" = hasRange
    ? (normDirection ?? fallbackDirection())
    : "neutral";
  return statusFor(value, lo, hi, polarity);
};

type LoadResult = { points: RawPoint[]; unauthorized: boolean };

async function loadLabPoints(req: NextRequest): Promise<LoadResult> {
  try {
    const origin = new URL(req.url, "http://localhost").origin;
    const headers: Record<string, string> = { Accept: "application/json" };
    const cookie = req.headers.get("cookie");
    if (cookie) headers.cookie = cookie;
    const res = await fetch(`${origin}/api/labs/summary?mode=ai-doc`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (res.status === 401) {
      return { points: [], unauthorized: true };
    }
    const body = await res.json().catch(() => ({}));
    const out: RawPoint[] = [];
    if (Array.isArray(body?.points)) {
      for (const row of body.points) {
        const iso = String(row?.taken_at ?? row?.observed_at ?? row?.takenAt ?? row?.sample_date ?? row?.date ?? "");
        const name = String(row?.test_name ?? row?.test ?? row?.name ?? row?.metric ?? row?.test_code ?? "").trim();
        if (!iso || !name) continue;
        out.push({
          iso,
          name,
          value: typeof row?.value_num === "number" ? row.value_num : row?.value ?? null,
          unit: row?.unit ?? null,
          lo: parseNumber(row?.ref_low ?? row?.refLow ?? row?.range_low ?? row?.low ?? null),
          hi: parseNumber(row?.ref_high ?? row?.refHigh ?? row?.range_high ?? row?.high ?? null),
          status: typeof row?.status === "string" ? row.status : null,
          direction: typeof row?.direction === "string" ? row.direction : null,
        });
      }
      return { points: out, unauthorized: false };
    }

    if (Array.isArray(body?.trend)) {
      for (const entry of body.trend) {
        const baseName = String(entry?.test_name ?? entry?.test ?? entry?.name ?? entry?.test_code ?? "").trim();
        const series = Array.isArray(entry?.series) ? entry.series : [];
        for (const point of series) {
          const iso = String(point?.sample_date ?? point?.taken_at ?? point?.observed_at ?? point?.date ?? "");
          if (!iso || !baseName) continue;
          out.push({
            iso,
            name: baseName,
            value: typeof point?.value === "number" ? point.value : parseNumber(point?.value ?? point?.value_num ?? null),
            unit: point?.unit ?? entry?.unit ?? null,
            lo: parseNumber(point?.ref_low ?? entry?.ref_low ?? null),
            hi: parseNumber(point?.ref_high ?? entry?.ref_high ?? null),
            status: typeof point?.status === "string" ? point.status : null,
            direction: typeof entry?.direction === "string" ? entry.direction : null,
          });
        }
      }
    }

    return { points: out, unauthorized: false };
  } catch (err) {
    console.error("[AIDOC_HOTFIX_FETCH]", err);
    return { points: [], unauthorized: false };
  }
}

type Snapshot = {
  byDate: Record<string, Hi[]>;
  series: Map<string, Array<{ date: string; value: number | null; unit: string | null; status: string }>>;
};

function buildSnapshot(points: RawPoint[]): Snapshot {
  const byDateMap = new Map<string, Map<string, { h: Hi; ts: number }>>();

  for (const point of points) {
    const iso = point.iso;
    const ts = Date.parse(iso);
    const date = Number.isFinite(ts) ? new Date(ts).toISOString().slice(0, 10) : iso.slice(0, 10);
    if (!date) continue;
    const canonical = canon(point.name);
    const displayName = canonical || point.name;
    const valueNum = typeof point.value === "number" ? point.value : parseNumber(point.value);
    const normStatus = (() => {
      if (typeof point.status === "string" && point.status) {
        const s = point.status.toLowerCase();
        if (s === "high" || s === "low" || s === "normal" || s === "ok") return s as Hi["status"];
      }
      return normalizeStatus(valueNum, point.lo, point.hi, point.direction, canonical);
    })();

    const hi: Hi = {
      name: displayName,
      value: valueNum ?? point.value ?? null,
      unit: point.unit ?? null,
      status: normStatus,
    };

    const dateMap = byDateMap.get(date) ?? new Map<string, { h: Hi; ts: number }>();
    const prev = dateMap.get(canonical || displayName);
    if (!prev || (Number.isFinite(ts) ? ts : Date.parse(date)) >= prev.ts) {
      dateMap.set(canonical || displayName, { h: hi, ts: Number.isFinite(ts) ? ts : Date.parse(date) });
    }
    byDateMap.set(date, dateMap);
  }

  const byDate: Record<string, Hi[]> = {};
  const series = new Map<string, Array<{ date: string; value: number | null; unit: string | null; status: string }>>();

  for (const [date, entries] of byDateMap.entries()) {
    const arr = Array.from(entries.values())
      .map((entry) => entry.h)
      .sort((a, b) => canon(a.name).localeCompare(canon(b.name)) || a.name.localeCompare(b.name));
    byDate[date] = arr;
  }

  const sortedDates = Object.keys(byDate).sort();
  for (const date of sortedDates) {
    for (const h of byDate[date]) {
      const key = canon(h.name);
      const existing = series.get(key) ?? [];
      const numericValue = typeof h.value === "number" ? h.value : parseNumber(h.value ?? null);
      existing.push({ date, value: numericValue, unit: h.unit, status: h.status });
      series.set(key, existing);
    }
  }

  for (const [, arr] of series.entries()) {
    arr.sort((a, b) => a.date.localeCompare(b.date));
  }

  return { byDate, series };
}

export async function aidocHotfix(req: NextRequest, body: any) {
  if (!HF_enabled()) return null;

  const message = String(body?.message ?? body?.text ?? "");
  const threadType = String(body?.threadType ?? body?.thread?.type ?? "").toLowerCase();
  if (threadType !== "aidoc") return null;

  const s = message.toLowerCase();
  const isPull = PULL_RE.test(s);
  const isCompareAll = COMPARE_RE.test(s);
  const isOverall = OVERALL_RE.test(s);

  let metricCanon: string | null = null;
  if (/\bcompare\b/.test(s)) {
    for (const [canonName, aliases] of Object.entries(METRIC)) {
      if (aliases.some((a) => s.includes(a))) {
        metricCanon = canonName;
        break;
      }
    }
  }

  if (!(isPull || isCompareAll || isOverall || metricCanon)) return null;

  try {
    const { points, unauthorized } = await loadLabPoints(req);
    if (unauthorized) {
      return NextResponse.json({ role: "assistant", content: "Please sign in to view your reports." });
    }
    const snapshot = buildSnapshot(points);

    if (metricCanon) {
      const series = snapshot.series.get(metricCanon) ?? [];
      return NextResponse.json({ role: "assistant", content: mdMetric(metricCanon, series) });
    }

    return NextResponse.json({ role: "assistant", content: mdSnapshot(snapshot.byDate) });
  } catch (err) {
    console.error("[AIDOC_HOTFIX_ERROR]", err);
    return NextResponse.json({ role: "assistant", content: "## Patient Snapshot\nCould not read labs right now. Try again shortly." });
  }
}
