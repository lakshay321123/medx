import { buildLongitudinalFeatures, getMetricValue, getSlope, hasRecentMeasurement } from "./features";
import type { DomainResult, LongitudinalFeatures, PatientDataset, RiskBand } from "./types";

const MODEL_ID = "longitudinal-risk@2025-10-01";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function bandFromScore(score: number): RiskBand {
  if (!Number.isFinite(score)) return "Unknown";
  if (score >= 0.66) return "High";
  if (score >= 0.33) return "Moderate";
  return "Low";
}

type Contribution = {
  id: string;
  name: string;
  weight: number;
  score: number | undefined;
  detail: string;
};

function riskAscending(value: number | undefined, bands: { max: number; score: number }[]): number | undefined {
  if (value == null) return undefined;
  for (const band of bands) {
    if (value <= band.max) return band.score;
  }
  return bands[bands.length - 1]?.score ?? undefined;
}

function riskDescending(value: number | undefined, bands: { min: number; score: number }[]): number | undefined {
  if (value == null) return undefined;
  for (const band of bands) {
    if (value >= band.min) return band.score;
  }
  return bands[bands.length - 1]?.score ?? undefined;
}

function formatNumber(value: number | undefined, precision = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(precision);
}

function buildMetricSnapshot(features: LongitudinalFeatures, key: string) {
  const metric = features.metrics[key];
  if (!metric) return null;
  const w7 = metric.windows["7d"];
  const w30 = metric.windows["30d"];
  const w90 = metric.windows["90d"];
  const w365 = metric.windows["365d"];
  return {
    latest: metric.latest
      ? {
          value: metric.latest.value,
          takenAt: metric.latest.takenAt,
          unit: metric.latest.unit ?? null,
        }
      : null,
    mean7d: w7?.mean ?? null,
    mean30d: w30?.mean ?? null,
    mean90d: w90?.mean ?? null,
    mean365d: w365?.mean ?? null,
    slope90d: w90?.slopePerDay ?? null,
    daysSinceLast: w365?.daysSinceLast ?? null,
  };
}

function staleCheck(features: LongitudinalFeatures, keys: string[]): string[] {
  const reasons: string[] = [];
  for (const key of keys) {
    const metric = features.metrics[key];
    if (!metric) {
      reasons.push(`${key} missing`);
      continue;
    }
    const isFresh = hasRecentMeasurement(metric, 365);
    if (!isFresh) {
      reasons.push(`${key} older than 365d`);
    }
  }
  return reasons;
}

function finalizeDomain(
  condition: DomainResult["condition"],
  contributions: Contribution[],
  features: LongitudinalFeatures,
  extras: Record<string, any>,
  staleReasons: string[],
): DomainResult {
  const totalWeight = contributions.reduce((acc, c) => acc + c.weight, 0);
  const weighted = contributions.reduce((acc, c) => acc + c.weight * clamp01(c.score ?? 0), 0);
  let riskScore = totalWeight > 0 ? clamp01(weighted / totalWeight) : 0;
  let riskLabel: RiskBand = totalWeight > 0 ? bandFromScore(riskScore) : "Unknown";
  const factors: { name: string; detail: string }[] = [];

  const sorted = [...contributions]
    .filter(c => c.score != null && Number.isFinite(c.score))
    .sort((a, b) => b.weight * (b.score ?? 0) - a.weight * (a.score ?? 0));
  for (const c of sorted) {
    if (!c.detail) continue;
    factors.push({ name: c.name, detail: c.detail });
  }

  if (staleReasons.length) {
    riskLabel = "Unknown";
    riskScore = 0;
    factors.unshift({ name: "Data stale/insufficient", detail: staleReasons.join(", ") });
  }
  if (!factors.length) {
    factors.push({ name: "No significant factors", detail: "Insufficient signals captured" });
  }

  return {
    condition,
    group: "Cardio-Metabolic",
    riskScore,
    riskLabel,
    topFactors: factors.slice(0, 4),
    features: extras,
    generatedAt: features.generatedAt,
    model: MODEL_ID,
  };
}

function cardiovascular(features: LongitudinalFeatures): DomainResult {
  const metricLDL = features.metrics["ldl"];
  const metricSBP = features.metrics["sbp"];
  const metricDBP = features.metrics["dbp"];
  const metricBMI = features.metrics["bmi"];
  const ldlMean = getMetricValue(metricLDL, "90d") ?? getMetricValue(metricLDL, "365d");
  const sbpMean = getMetricValue(metricSBP, "90d") ?? getMetricValue(metricSBP, "365d");
  const dbpMean = getMetricValue(metricDBP, "90d") ?? getMetricValue(metricDBP, "365d");
  const bmiMean = getMetricValue(metricBMI, "365d");
  const ldlSlope = getSlope(metricLDL, "90d");
  const sbpSlope = getSlope(metricSBP, "90d");

  const contributions: Contribution[] = [];

  const ldlScore = riskAscending(ldlMean, [
    { max: 100, score: 0.1 },
    { max: 129, score: 0.35 },
    { max: 159, score: 0.6 },
    { max: 189, score: 0.8 },
    { max: Infinity, score: 1 },
  ]);
  if (ldlScore != null) {
    contributions.push({
      id: "ldl",
      name: "LDL (90-day mean)",
      weight: 0.4,
      score: ldlScore,
      detail: `LDL ${formatNumber(ldlMean)} mg/dL${ldlSlope != null ? `; slope ${formatNumber(ldlSlope, 2)}/day` : ""}`,
    });
  }

  const sbpScore = riskAscending(sbpMean, [
    { max: 119, score: 0.1 },
    { max: 129, score: 0.35 },
    { max: 139, score: 0.6 },
    { max: 159, score: 0.8 },
    { max: Infinity, score: 1 },
  ]);
  if (sbpScore != null) {
    contributions.push({
      id: "sbp",
      name: "SBP (90-day mean)",
      weight: 0.35,
      score: sbpScore,
      detail: `SBP ${formatNumber(sbpMean)} mmHg${sbpSlope != null ? `; slope ${formatNumber(sbpSlope, 2)}/day` : ""}`,
    });
  }

  if (dbpMean != null) {
    const dbpScore = riskAscending(dbpMean, [
      { max: 80, score: 0.1 },
      { max: 89, score: 0.35 },
      { max: 99, score: 0.6 },
      { max: 109, score: 0.8 },
      { max: Infinity, score: 1 },
    ]);
    contributions.push({
      id: "dbp",
      name: "DBP (90-day mean)",
      weight: 0.15,
      score: dbpScore,
      detail: `DBP ${formatNumber(dbpMean)} mmHg`,
    });
  }

  if (bmiMean != null) {
    const bmiScore = riskAscending(bmiMean, [
      { max: 24.9, score: 0.1 },
      { max: 29.9, score: 0.3 },
      { max: 34.9, score: 0.6 },
      { max: 39.9, score: 0.8 },
      { max: Infinity, score: 1 },
    ]);
    contributions.push({
      id: "bmi",
      name: "BMI (365-day mean)",
      weight: 0.1,
      score: bmiScore,
      detail: `BMI ${formatNumber(bmiMean)} kg/m²`,
    });
  }

  const noteTags = features.noteFlags.tags;
  if (noteTags.some(t => /smok/.test(t))) {
    contributions.push({
      id: "smoking",
      name: "Smoking flag",
      weight: 0.1,
      score: 1,
      detail: "Notes/tags indicate current or recent smoking",
    });
  }

  const staleReasons = staleCheck(features, ["ldl", "sbp"]);

  const extras = {
    metrics: {
      ldl: buildMetricSnapshot(features, "ldl"),
      sbp: buildMetricSnapshot(features, "sbp"),
      dbp: buildMetricSnapshot(features, "dbp"),
      bmi: buildMetricSnapshot(features, "bmi"),
    },
    medicationStats: features.medicationStats,
    encounterStats: features.encounterStats,
    notes: { tags: noteTags },
  };

  return finalizeDomain("Cardiovascular", contributions, features, extras, staleReasons);
}

function metabolic(features: LongitudinalFeatures): DomainResult {
  const metricA1c = features.metrics["hba1c"];
  const metricGlucose = features.metrics["glucose"];
  const metricBMI = features.metrics["bmi"];
  const metricTG = features.metrics["tg"];

  const a1cMean = getMetricValue(metricA1c, "90d") ?? getMetricValue(metricA1c, "365d");
  const glucoseMean = getMetricValue(metricGlucose, "30d") ?? getMetricValue(metricGlucose, "90d") ?? getMetricValue(metricGlucose, "365d");
  const bmiMean = getMetricValue(metricBMI, "365d");
  const tgMean = getMetricValue(metricTG, "365d");

  const contributions: Contribution[] = [];

  const a1cScore = riskAscending(a1cMean, [
    { max: 6.4, score: 0.1 },
    { max: 6.9, score: 0.35 },
    { max: 7.9, score: 0.6 },
    { max: 8.9, score: 0.8 },
    { max: Infinity, score: 1 },
  ]);
  if (a1cScore != null) {
    contributions.push({
      id: "hba1c",
      name: "HbA1c (90-day mean)",
      weight: 0.45,
      score: a1cScore,
      detail: `HbA1c ${formatNumber(a1cMean)} %`,
    });
  }

  const glucoseScore = riskAscending(glucoseMean, [
    { max: 99, score: 0.1 },
    { max: 125, score: 0.35 },
    { max: 179, score: 0.6 },
    { max: 249, score: 0.8 },
    { max: Infinity, score: 1 },
  ]);
  if (glucoseScore != null) {
    contributions.push({
      id: "glucose",
      name: "Glucose (recent mean)",
      weight: 0.25,
      score: glucoseScore,
      detail: `Glucose ${formatNumber(glucoseMean)} mg/dL`,
    });
  }

  if (bmiMean != null) {
    const bmiScore = riskAscending(bmiMean, [
      { max: 24.9, score: 0.1 },
      { max: 29.9, score: 0.3 },
      { max: 34.9, score: 0.6 },
      { max: 39.9, score: 0.8 },
      { max: Infinity, score: 1 },
    ]);
    contributions.push({
      id: "bmi",
      name: "BMI (365-day mean)",
      weight: 0.2,
      score: bmiScore,
      detail: `BMI ${formatNumber(bmiMean)} kg/m²`,
    });
  }

  if (tgMean != null) {
    const tgScore = riskAscending(tgMean, [
      { max: 150, score: 0.2 },
      { max: 199, score: 0.45 },
      { max: 499, score: 0.75 },
      { max: Infinity, score: 1 },
    ]);
    contributions.push({
      id: "tg",
      name: "Triglycerides (365-day mean)",
      weight: 0.1,
      score: tgScore,
      detail: `TG ${formatNumber(tgMean)} mg/dL`,
    });
  }

  const noteTags = features.noteFlags.tags;
  if (noteTags.some(t => /gestational|pregnancy diabetes/i.test(t))) {
    contributions.push({
      id: "gdm_history",
      name: "History of GDM",
      weight: 0.05,
      score: 0.6,
      detail: "Notes flag gestational diabetes history",
    });
  }

  const staleReasons = staleCheck(features, ["hba1c", "bmi"]);

  const extras = {
    metrics: {
      hba1c: buildMetricSnapshot(features, "hba1c"),
      glucose: buildMetricSnapshot(features, "glucose"),
      bmi: buildMetricSnapshot(features, "bmi"),
      tg: buildMetricSnapshot(features, "tg"),
    },
    medicationStats: features.medicationStats,
    notes: { tags: noteTags },
  };

  return finalizeDomain("Metabolic", contributions, features, extras, staleReasons);
}

function renal(features: LongitudinalFeatures): DomainResult {
  const metricEgfr = features.metrics["egfr"];
  const metricCreat = features.metrics["creat"];
  const metricSBP = features.metrics["sbp"];

  const egfrMean = getMetricValue(metricEgfr, "90d") ?? getMetricValue(metricEgfr, "365d");
  const creatMean = getMetricValue(metricCreat, "90d") ?? getMetricValue(metricCreat, "365d");
  const sbpMean = getMetricValue(metricSBP, "365d");

  const contributions: Contribution[] = [];

  const egfrScore = riskDescending(egfrMean, [
    { min: 90, score: 0.05 },
    { min: 60, score: 0.3 },
    { min: 45, score: 0.55 },
    { min: 30, score: 0.75 },
    { min: 15, score: 0.9 },
    { min: 0, score: 1 },
  ]);
  if (egfrScore != null) {
    contributions.push({
      id: "egfr",
      name: "eGFR (recent mean)",
      weight: 0.6,
      score: egfrScore,
      detail: `eGFR ${formatNumber(egfrMean)} mL/min/1.73m²`,
    });
  }

  if (creatMean != null) {
    const creatScore = riskAscending(creatMean, [
      { max: 1.2, score: 0.1 },
      { max: 1.6, score: 0.45 },
      { max: 2.5, score: 0.75 },
      { max: Infinity, score: 1 },
    ]);
    contributions.push({
      id: "creat",
      name: "Creatinine (recent mean)",
      weight: 0.25,
      score: creatScore,
      detail: `Creatinine ${formatNumber(creatMean)} mg/dL`,
    });
  }

  if (sbpMean != null) {
    const sbpScore = riskAscending(sbpMean, [
      { max: 119, score: 0.1 },
      { max: 129, score: 0.35 },
      { max: 139, score: 0.6 },
      { max: 159, score: 0.8 },
      { max: Infinity, score: 1 },
    ]);
    contributions.push({
      id: "renal_bp",
      name: "Blood pressure load",
      weight: 0.15,
      score: sbpScore,
      detail: `SBP ${formatNumber(sbpMean)} mmHg`,
    });
  }

  const noteTags = features.noteFlags.tags;
  if (noteTags.some(t => /nsaid/.test(t))) {
    contributions.push({
      id: "nsaid",
      name: "NSAID exposure flag",
      weight: 0.1,
      score: 0.6,
      detail: "Notes indicate NSAID use",
    });
  }

  const staleReasons = staleCheck(features, ["egfr", "creat"]);
  const extras = {
    metrics: {
      egfr: buildMetricSnapshot(features, "egfr"),
      creat: buildMetricSnapshot(features, "creat"),
      sbp: buildMetricSnapshot(features, "sbp"),
    },
    notes: { tags: noteTags },
  };

  return finalizeDomain("Renal", contributions, features, extras, staleReasons);
}

export function computeDomainResults(dataset: PatientDataset, now = new Date()): {
  features: LongitudinalFeatures;
  domains: DomainResult[];
} {
  const features = buildLongitudinalFeatures(dataset, now);
  const domains = [cardiovascular(features), metabolic(features), renal(features)];
  return { features, domains };
}

export { MODEL_ID };
