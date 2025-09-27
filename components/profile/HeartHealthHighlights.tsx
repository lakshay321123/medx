"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export type LatestObservation = {
  value: any;
  unit: string | null;
  observedAt: string;
};

export type LatestObservationMap = Record<string, LatestObservation | undefined>;

export type ProfileVitals = {
  systolic: number | null;
  diastolic: number | null;
};

type Status = "good" | "borderline" | "high" | "low";

type HighlightRow = {
  id: string;
  label: string;
  measurementLabel: string;
  displayValue: string;
  observedAt: string | null;
  status: Status;
  statusLabel: string;
  note: string;
  navigateKey: string;
  hasData: boolean;
};

const STATUS_COLORS: Record<Status, string> = {
  good: "bg-emerald-500 dark:bg-emerald-400",
  borderline: "bg-amber-500 dark:bg-amber-400",
  high: "bg-rose-500 dark:bg-rose-400",
  low: "bg-rose-500 dark:bg-rose-400",
};

const STATUS_TEXT: Record<Status, string> = {
  good: "Good",
  borderline: "Borderline",
  high: "High",
  low: "Low",
};

const MONTH_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  year: "numeric",
};

type HeroData = {
  percent: number;
  status: Status;
  statusText: string;
  label: string;
  valueText: string;
  hasData: boolean;
  navigateKey: string;
};

type HeroCircleStyle = CSSProperties & Record<"--hero-percent", number>;

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const KEY_ALIASES: Record<string, string> = {
  ldl_cholesterol: "ldl",
  ldl_c: "ldl",
  ldlc: "ldl",
  total_chol: "total_cholesterol",
  total_cholesterol_hdl_ratio: "total_cholesterol",
  cholesterol_total: "total_cholesterol",
  hba1c_percent: "hba1c",
  hba1c_ngsp: "hba1c",
  glycated_hemoglobin: "hba1c",
  fasting_plasma_glucose: "fasting_glucose",
  fpg: "fasting_glucose",
  egfr_ckd_epi: "egfr",
  egfr_ml_min_1_73m2: "egfr",
  e_gfr: "egfr",
  serum_creatinine: "creatinine",
  creatinine_serum: "creatinine",
  creatinine_mg_dl: "creatinine",
  alt_sgpt: "alt",
  ast_sgot: "ast",
  vitamin_d3: "vitamin_d",
  vit_d: "vitamin_d",
  vit_d_total: "vitamin_d",
  haemoglobin: "hemoglobin",
  hb: "hemoglobin",
  bp: "blood_pressure",
  blood_pressure: "blood_pressure",
  bp_systolic: "bp_systolic",
  systolic_bp: "bp_systolic",
  bp_diastolic: "bp_diastolic",
  diastolic_bp: "bp_diastolic",
};

function register(map: Record<string, LatestObservation>, key: string, entry: LatestObservation) {
  if (!key || map[key]) return;
  map[key] = entry;
}

function buildNormalizedMap(latest: LatestObservationMap): Record<string, LatestObservation> {
  const out: Record<string, LatestObservation> = {};
  for (const [rawKey, entry] of Object.entries(latest || {})) {
    if (!entry) continue;
    const normalized = normalizeKey(rawKey);
    register(out, normalized, entry);
    const alias = KEY_ALIASES[normalized];
    if (alias) register(out, alias, entry);
  }
  return out;
}

function parseNumber(value: any): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.+-]+/g, "").replace(/\.(?=.*\.)/g, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatLast(observedAt?: string | null) {
  if (!observedAt) return "Last: —";
  const date = new Date(observedAt);
  if (Number.isNaN(date.getTime())) return "Last: —";
  return `Last: ${date.toLocaleDateString(undefined, MONTH_FORMAT)}`;
}

function clampPercent(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function toValueText(entry: LatestObservation | null, fallbackLabel: string, unitOverride?: string | null) {
  if (!entry) return `${fallbackLabel} —`;
  const raw = entry.value;
  if (raw == null || raw === "") return `${fallbackLabel} —`;
  const unit = unitOverride ?? entry.unit;
  return `${fallbackLabel} ${String(raw)}${unit ? ` ${unit}` : ""}`.trim();
}

function formatNumericValue(value: number | null, unit?: string | null, opts?: { precision?: number }) {
  if (value == null || Number.isNaN(value)) return "—";
  const precision = opts?.precision ?? (Number.isInteger(value) ? 0 : 1);
  const rounded = value.toFixed(precision);
  return `${rounded.replace(/\.0$/, "")}${unit ? ` ${unit}` : ""}`.trim();
}

function buildHeartHealth(map: Record<string, LatestObservation>): [HighlightRow, HeroData] {
  const ldlEntry = map.ldl || null;
  const totalCholEntry = map.total_cholesterol || null;
  const measurement = ldlEntry ?? totalCholEntry;
  const numeric = parseNumber(measurement?.value);
  const usingLdl = Boolean(ldlEntry);
  let status: Status = "good";
  let note = usingLdl
    ? "At goal—keep up heart-healthy habits."
    : "Within goal range.";

  if (numeric != null) {
    if (usingLdl) {
      if (numeric >= 130) {
        status = "high";
        note = "Above goal; consider diet/statin review.";
      } else if (numeric >= 100) {
        status = "borderline";
        note = "Near goal; review lifestyle and follow-up.";
      }
    } else {
      if (numeric >= 240) {
        status = "high";
        note = "Elevated total cholesterol; review with your clinician.";
      } else if (numeric >= 200) {
        status = "borderline";
        note = "Borderline high; consider diet and recheck.";
      } else {
        note = "Total cholesterol in goal range.";
      }
    }
  }

  const label = usingLdl ? "LDL" : "Total Chol";
  const displayValue = measurement
    ? `${label} ${formatNumericValue(numeric, measurement.unit ?? (usingLdl ? "mg/dL" : "mg/dL"))}`
    : "—";

  const observedAt = measurement?.observedAt ?? null;
  const hasData = Boolean(measurement?.value != null && measurement?.value !== "");

  let percent = 25;
  if (usingLdl && numeric != null) {
    percent = clampPercent(((190 - numeric) / 120) * 100);
  } else if (numeric != null) {
    percent = clampPercent(((240 - numeric) / 170) * 100);
  }

  const hero: HeroData = {
    percent,
    status,
    statusText: STATUS_TEXT[status],
    label,
    valueText: displayValue,
    hasData,
    navigateKey: usingLdl ? "ldl" : "total_cholesterol",
  };

  const row: HighlightRow = {
    id: "heart",
    label: "Heart Health",
    measurementLabel: label,
    displayValue: displayValue === "—" ? `${label} —` : displayValue,
    observedAt,
    status,
    statusLabel: STATUS_TEXT[status],
    note: hasData ? note : "No data available",
    navigateKey: hero.navigateKey,
    hasData,
  };

  return [row, hero];
}

function buildDiabetes(map: Record<string, LatestObservation>): HighlightRow {
  const hba1cEntry = map.hba1c || null;
  const glucoseEntry = map.fasting_glucose || null;
  const measurement = hba1cEntry ?? glucoseEntry;
  const numeric = parseNumber(measurement?.value);
  const usingA1c = Boolean(hba1cEntry);
  let status: Status = "good";
  let note = usingA1c ? "HbA1c at goal." : "Fasting glucose in range.";

  if (numeric != null) {
    if (usingA1c) {
      if (numeric >= 6.5) {
        status = "high";
        note = "Slightly high; aim <6.5% if safe.";
      } else if (numeric >= 5.7) {
        status = "borderline";
        note = "Prediabetes range—reinforce lifestyle.";
      }
    } else {
      if (numeric >= 126) {
        status = "high";
        note = "Diabetes range; review management.";
      } else if (numeric >= 100) {
        status = "borderline";
        note = "Impaired fasting glucose—monitor.";
      }
    }
  }

  const unit = usingA1c ? "%" : measurement?.unit ?? (glucoseEntry ? "mg/dL" : undefined);
  const label = usingA1c ? "HbA1c" : "Fasting Glucose";
  const displayValue = measurement
    ? `${label} ${formatNumericValue(numeric, unit)}`
    : "—";
  const hasData = Boolean(measurement?.value != null && measurement?.value !== "");

  return {
    id: "diabetes",
    label: "Diabetes Control",
    measurementLabel: label,
    displayValue: displayValue === "—" ? `${label} —` : displayValue,
    observedAt: measurement?.observedAt ?? null,
    status,
    statusLabel: STATUS_TEXT[status],
    note: hasData ? note : "No data available",
    navigateKey: usingA1c ? "hba1c" : "fasting_glucose",
    hasData,
  };
}

function buildKidney(map: Record<string, LatestObservation>): HighlightRow {
  const egfrEntry = map.egfr || null;
  const creatEntry = map.creatinine || null;
  const measurement = egfrEntry ?? creatEntry;
  const numeric = parseNumber(measurement?.value);
  const usingEgfr = Boolean(egfrEntry);
  let status: Status = "good";
  let note = usingEgfr ? "Kidney function looks stable." : "Creatinine in goal range.";

  if (numeric != null) {
    if (usingEgfr) {
      if (numeric < 60) {
        status = "high";
        note = "Reduced kidney function; follow up recommended.";
      } else if (numeric < 90) {
        status = "borderline";
        note = "Mild decrease—monitor trends.";
      }
    } else {
      if (numeric > 1.5) {
        status = "high";
        note = "Elevated creatinine; correlate clinically.";
      } else if (numeric > 1.2) {
        status = "borderline";
        note = "Slightly high—ensure hydration and recheck.";
      }
    }
  }

  const unit = usingEgfr
    ? measurement?.unit ?? "mL/min/1.73m²"
    : measurement?.unit ?? "mg/dL";
  const label = usingEgfr ? "eGFR" : "Creatinine";
  const displayValue = measurement
    ? `${label} ${formatNumericValue(numeric, unit)}`
    : "—";
  const hasData = Boolean(measurement?.value != null && measurement?.value !== "");

  return {
    id: "kidney",
    label: "Kidney Function",
    measurementLabel: label,
    displayValue: displayValue === "—" ? `${label} —` : displayValue,
    observedAt: measurement?.observedAt ?? null,
    status,
    statusLabel: usingEgfr && status === "high" ? "High risk" : STATUS_TEXT[status],
    note: hasData ? note : "No data available",
    navigateKey: usingEgfr ? "egfr" : "creatinine",
    hasData,
  };
}

function buildLiver(map: Record<string, LatestObservation>): HighlightRow {
  const altEntry = map.alt || null;
  const astEntry = map.ast || null;
  const measurement = altEntry ?? astEntry;
  const numeric = parseNumber(measurement?.value);
  const usingAlt = Boolean(altEntry);
  let status: Status = "good";
  let note = usingAlt ? "ALT within normal range." : "AST within normal range.";

  if (numeric != null) {
    if (usingAlt) {
      if (numeric > 40) {
        status = "high";
        note = "Elevated ALT—review liver health.";
      } else if (numeric > 30) {
        status = "borderline";
        note = "Slightly high; check medications/alcohol.";
      }
    } else {
      if (numeric > 50) {
        status = "high";
        note = "Elevated AST—consider follow-up.";
      } else if (numeric > 35) {
        status = "borderline";
        note = "Mild elevation; monitor.";
      }
    }
  }

  const label = usingAlt ? "ALT" : "AST";
  const unit = measurement?.unit ?? "U/L";
  const displayValue = measurement
    ? `${label} ${formatNumericValue(numeric, unit)}`
    : "—";
  const hasData = Boolean(measurement?.value != null && measurement?.value !== "");

  return {
    id: "liver",
    label: "Liver Health",
    measurementLabel: label,
    displayValue: displayValue === "—" ? `${label} —` : displayValue,
    observedAt: measurement?.observedAt ?? null,
    status,
    statusLabel: STATUS_TEXT[status],
    note: hasData ? note : "No data available",
    navigateKey: usingAlt ? "alt" : "ast",
    hasData,
  };
}

function buildOverall(map: Record<string, LatestObservation>): HighlightRow {
  const vitaminDEntry = map.vitamin_d || null;
  const hemoglobinEntry = map.hemoglobin || null;
  const measurement = vitaminDEntry ?? hemoglobinEntry;
  const numeric = parseNumber(measurement?.value);
  const usingVitD = Boolean(vitaminDEntry);
  let status: Status = "good";
  let note = usingVitD ? "Vitamin D in optimal range." : "Hemoglobin within range.";

  if (numeric != null) {
    if (usingVitD) {
      if (numeric < 20) {
        status = "low";
        note = "Low vitamin D; discuss supplementation.";
      } else if (numeric < 30) {
        status = "borderline";
        note = "Insufficient—consider supplement and sunlight.";
      }
    } else {
      if (numeric < 10) {
        status = "low";
        note = "Low hemoglobin; evaluate anemia causes.";
      } else if (numeric < 12) {
        status = "borderline";
        note = "Mild anemia range—monitor.";
      }
    }
  }

  const label = usingVitD ? "Vitamin D" : "Hemoglobin";
  const unit = usingVitD ? measurement?.unit ?? "ng/mL" : measurement?.unit ?? "g/dL";
  const displayValue = measurement
    ? `${label} ${formatNumericValue(numeric, unit)}`
    : "—";
  const hasData = Boolean(measurement?.value != null && measurement?.value !== "");

  return {
    id: "overall",
    label: "Overall Health",
    measurementLabel: label,
    displayValue: displayValue === "—" ? `${label} —` : displayValue,
    observedAt: measurement?.observedAt ?? null,
    status,
    statusLabel: STATUS_TEXT[status],
    note: hasData ? note : "No data available",
    navigateKey: usingVitD ? "vitamin_d" : "hemoglobin",
    hasData,
  };
}

function buildBloodPressure(
  map: Record<string, LatestObservation>,
  vitals: ProfileVitals | null
): HighlightRow | null {
  const bpEntry = map.blood_pressure || null;
  const sysEntry = map.bp_systolic || null;
  const diaEntry = map.bp_diastolic || null;
  const hasComposite = Boolean(bpEntry?.value);

  let systolic: number | null = null;
  let diastolic: number | null = null;
  let observedAt: string | null = null;

  if (hasComposite && typeof bpEntry?.value === "string" && bpEntry.value.includes("/")) {
    const [sRaw, dRaw] = bpEntry.value.split("/");
    systolic = parseNumber(sRaw);
    diastolic = parseNumber(dRaw);
    observedAt = bpEntry.observedAt;
  }
  if (systolic == null && sysEntry) {
    systolic = parseNumber(sysEntry.value);
    observedAt = observedAt ?? sysEntry.observedAt;
  }
  if (diastolic == null && diaEntry) {
    diastolic = parseNumber(diaEntry.value);
    observedAt = observedAt ?? diaEntry.observedAt;
  }

  if (systolic == null && vitals?.systolic != null) systolic = vitals.systolic;
  if (diastolic == null && vitals?.diastolic != null) diastolic = vitals.diastolic;

  if (systolic == null || diastolic == null) return null;

  let status: Status = "good";
  let note = "Blood pressure at goal.";
  if (systolic >= 140 || diastolic >= 90) {
    status = "high";
    note = "High; review meds/lifestyle.";
  } else if (systolic >= 120 || diastolic >= 80) {
    status = "borderline";
    note = "Elevated—monitor at home.";
  }

  const displayValue = `${systolic}/${diastolic} mmHg`;

  return {
    id: "bp",
    label: "Blood Pressure",
    measurementLabel: "BP",
    displayValue,
    observedAt,
    status,
    statusLabel: STATUS_TEXT[status],
    note,
    navigateKey: "blood_pressure",
    hasData: true,
  };
}

function useHeroAnimationKey(percent: number, status: Status) {
  const [key, setKey] = useState(0);
  useEffect(() => {
    setKey(k => k + 1);
  }, [percent, status]);
  return key;
}

export function HeartHealthHighlights({
  latest,
  vitals,
}: {
  latest: LatestObservationMap;
  vitals: ProfileVitals | null;
}) {
  const router = useRouter();
  const prefersReducedMotion = usePrefersReducedMotion();

  const normalized = useMemo(() => buildNormalizedMap(latest), [latest]);

  const [heartRow, heroData] = useMemo(() => buildHeartHealth(normalized), [normalized]);
  const diabetesRow = useMemo(() => buildDiabetes(normalized), [normalized]);
  const kidneyRow = useMemo(() => buildKidney(normalized), [normalized]);
  const liverRow = useMemo(() => buildLiver(normalized), [normalized]);
  const overallRow = useMemo(() => buildOverall(normalized), [normalized]);
  const bpRow = useMemo(() => buildBloodPressure(normalized, vitals), [normalized, vitals]);

  const rows = useMemo(() => {
    const base = [heartRow, diabetesRow, kidneyRow, liverRow, overallRow];
    if (bpRow) base.push(bpRow);
    return base;
  }, [heartRow, diabetesRow, kidneyRow, liverRow, overallRow, bpRow]);

  const hasAnyData = rows.some(row => row.hasData);
  const heroKey = useHeroAnimationKey(heroData.percent, heroData.status);
  const heroCircumference = 2 * Math.PI * 68;
  const heroPercent = clampPercent(heroData.percent);
  const heroCircleStyle: HeroCircleStyle = {
    strokeLinecap: "round",
    strokeDasharray: `${heroCircumference}`,
    strokeDashoffset: prefersReducedMotion
      ? `${heroCircumference * (1 - heroPercent / 100)}`
      : undefined,
    animation: prefersReducedMotion
      ? "none"
      : `${heroData.hasData ? "heroSweep" : "heroBreath"} ${
          heroData.hasData ? "0.8s ease-out forwards" : "3.6s ease-in-out infinite"
        }`,
    "--hero-percent": heroPercent,
  };
  const [explainRow, setExplainRow] = useState<HighlightRow | null>(null);

  useEffect(() => {
    if (!explainRow) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExplainRow(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [explainRow]);

  const handleNavigate = (key: string) => {
    router.push(`/?panel=timeline&cat=LABS&focus=${encodeURIComponent(key)}`);
  };

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div
        role="button"
        tabIndex={0}
        className="mx-auto flex w-full max-w-[200px] flex-col items-center gap-3 outline-none transition hover:scale-[1.01] focus-visible:ring"
        onClick={() => handleNavigate(heroData.navigateKey)}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleNavigate(heroData.navigateKey);
          }
        }}
      >
        <div className="relative flex h-48 w-48 items-center justify-center">
          <svg className="h-full w-full" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r="68"
              className="stroke-muted/40"
              strokeWidth="12"
              fill="none"
            />
            <circle
              key={heroKey}
              cx="80"
              cy="80"
              r="68"
              strokeWidth="12"
              fill="none"
              className={`origin-center transition-colors duration-500 ${
                heroData.hasData ? (heroData.status === "good"
                  ? "stroke-emerald-500"
                  : heroData.status === "borderline"
                  ? "stroke-amber-500"
                  : "stroke-rose-500"
                ) : "stroke-muted"}`}
              style={heroCircleStyle}
              data-has-data={heroData.hasData ? "true" : "false"}
            />
          </svg>
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-2 text-center ${
              heroData.hasData ? "" : "text-muted-foreground"
            }`}
          >
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner ${
                prefersReducedMotion ? "" : "animate-heartPulse"
              }`}
            >
              <span className="text-3xl" aria-hidden>
                ❤
              </span>
            </div>
            <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {heroData.hasData ? heroData.label : "Heart"}
            </span>
            <span className="text-lg font-semibold">{heroData.hasData ? heroData.valueText : "No recent data"}</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium text-white ${
                heroData.hasData
                  ? heroData.status === "good"
                    ? "bg-emerald-500"
                    : heroData.status === "borderline"
                    ? "bg-amber-500"
                    : "bg-rose-500"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {heroData.hasData ? heroData.statusText : "No data"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3 text-sm">
        {hasAnyData ? (
          rows.map((row, index) => (
            <HighlightItem
              key={row.id}
              row={row}
              index={index}
              onNavigate={() => handleNavigate(row.navigateKey)}
              onExplain={() => setExplainRow(row)}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-5 text-center text-sm text-muted-foreground">
            No data available — upload reports to see highlights.
          </div>
        )}
      </div>

      {explainRow ? (
        <div className="mt-4 rounded-xl border bg-popover p-4 text-sm shadow-lg">
          <div className="flex items-start gap-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Explain this</div>
              <div className="text-base font-semibold">{explainRow.label}</div>
            </div>
            <button
              type="button"
              onClick={() => setExplainRow(null)}
              className="ml-auto rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              Close
            </button>
          </div>
          <p className="mt-2 text-muted-foreground">
            {explainRow.hasData
              ? explainRow.note
              : "We’ll explain this test once data is available."}
          </p>
        </div>
      ) : null}

      <style jsx>{`
        @keyframes heroSweep {
          from {
            stroke-dashoffset: ${2 * Math.PI * 68}px;
          }
          to {
            stroke-dashoffset: calc(${2 * Math.PI * 68}px * (1 - var(--hero-percent) / 100));
          }
        }
        @keyframes heroBreath {
          0% {
            stroke-dashoffset: calc(${2 * Math.PI * 68}px * 0.75);
            opacity: 0.4;
          }
          50% {
            stroke-dashoffset: calc(${2 * Math.PI * 68}px * 0.7);
            opacity: 0.8;
          }
          100% {
            stroke-dashoffset: calc(${2 * Math.PI * 68}px * 0.75);
            opacity: 0.4;
          }
        }
        @keyframes heroPulse {
          0%, 100% {
            transform: scale(1);
          }
          40% {
            transform: scale(1.03);
          }
        }
        @keyframes highlightEnter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes valuePulse {
          0% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.7;
          }
        }
        .animate-heartPulse {
          animation: heroPulse 6s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}

type HighlightItemProps = {
  row: HighlightRow;
  index: number;
  onNavigate: () => void;
  onExplain: () => void;
  prefersReducedMotion: boolean;
};

function HighlightItem({ row, index, onNavigate, onExplain, prefersReducedMotion }: HighlightItemProps) {
  const [pulseKey, setPulseKey] = useState(0);
  const signature = `${row.displayValue}-${row.status}-${row.note}`;

  useEffect(() => {
    setPulseKey(k => k + 1);
  }, [signature]);

  const animationStyle: CSSProperties | undefined = prefersReducedMotion
    ? undefined
    : { animation: `highlightEnter ${120 + index * 20}ms ease-out ${index * 60}ms both` };
  const valueAnimation: CSSProperties | undefined = prefersReducedMotion
    ? undefined
    : { animation: `valuePulse 320ms ease-in-out ${index * 40}ms` };

  return (
    <button
      type="button"
      onClick={onNavigate}
      onContextMenu={event => {
        event.preventDefault();
        onExplain();
      }}
      className="group flex w-full items-start justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition hover:border-muted-foreground/30 hover:bg-muted/30 focus-visible:border-primary focus-visible:outline-none"
      style={animationStyle}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>{row.label}</span>
          <span className="text-muted-foreground/60">•</span>
          <span
            className={`inline-flex h-2.5 w-2.5 rounded-full ${STATUS_COLORS[row.status]}`}
            aria-hidden
          />
          <span className="normal-case">{row.measurementLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span
            key={pulseKey}
            className="font-semibold"
            style={valueAnimation}
          >
            {row.displayValue}
          </span>
          <span className="text-xs text-muted-foreground">{formatLast(row.observedAt)}</span>
          <span className="text-xs text-muted-foreground">— {row.hasData ? row.note : "No data available"}</span>
        </div>
      </div>
      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        {row.hasData ? row.statusLabel : "No data"}
      </span>
    </button>
  );
}

export default HeartHealthHighlights;
