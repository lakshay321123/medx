import { expandVitalSamples, normalizeLab, extractNoteFlags } from "./normalize";
import type {
  LongitudinalFeatures,
  MetricFeatures,
  MetricSample,
  PatientDataset,
  WindowStats,
} from "./types";

const WINDOWS = [7, 30, 90, 365];

function toDate(value: string): Date {
  const d = new Date(value);
  return Number.isFinite(+d) ? d : new Date(0);
}

function daysBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000);
}

function computeWindow(samples: MetricSample[], windowDays: number, now: Date): WindowStats {
  const start = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const inWindow = samples.filter(s => toDate(s.takenAt) >= start);
  if (!inWindow.length) {
    return {
      days: windowDays,
      count: 0,
      mean: undefined,
      min: undefined,
      max: undefined,
      std: undefined,
      slopePerDay: undefined,
      outOfRangePct: undefined,
      timeSinceLastNormalDays: null,
      daysSinceLast: samples.length ? daysBetween(now, toDate(samples[samples.length - 1].takenAt)) : null,
    };
  }
  const values = inWindow.map(s => s.value);
  const count = values.length;
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / count;
  let min = values[0];
  let max = values[0];
  let variance = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    variance += Math.pow(v - mean, 2);
  }
  const std = Math.sqrt(variance / count);

  let slope: number | undefined = undefined;
  if (inWindow.length >= 2) {
    const xs = inWindow.map(s => (toDate(s.takenAt).getTime() - toDate(inWindow[0].takenAt).getTime()) / (24 * 60 * 60 * 1000));
    const xMean = xs.reduce((acc, v) => acc + v, 0) / xs.length;
    let num = 0;
    let den = 0;
    for (let i = 0; i < xs.length; i++) {
      num += (xs[i] - xMean) * (inWindow[i].value - mean);
      den += Math.pow(xs[i] - xMean, 2);
    }
    slope = den === 0 ? undefined : num / den;
    if (slope === undefined || Number.isNaN(slope)) slope = undefined;
  }

  let outOfRangePct: number | undefined;
  let timeSinceLastNormalDays: number | null = null;
  const last = inWindow[inWindow.length - 1];
  const lastDiff = daysBetween(now, toDate(last.takenAt));
  const withRanges = inWindow.filter(s => s.refLow != null || s.refHigh != null);
  if (withRanges.length) {
    const outside = withRanges.filter(r => {
      if (r.refLow != null && r.value < r.refLow) return true;
      if (r.refHigh != null && r.value > r.refHigh) return true;
      return false;
    }).length;
    outOfRangePct = Math.round((outside / withRanges.length) * 100);
    for (let i = withRanges.length - 1; i >= 0; i--) {
      const s = withRanges[i];
      if (s.refLow != null && s.value < s.refLow) continue;
      if (s.refHigh != null && s.value > s.refHigh) continue;
      timeSinceLastNormalDays = daysBetween(now, toDate(s.takenAt));
      break;
    }
  }

  return {
    days: windowDays,
    count,
    mean: Number.isFinite(mean) ? mean : undefined,
    min,
    max,
    std: Number.isFinite(std) ? std : undefined,
    slopePerDay: slope,
    outOfRangePct,
    timeSinceLastNormalDays,
    daysSinceLast: Number.isFinite(lastDiff) ? lastDiff : null,
  };
}

function sortSamples(map: Map<string, MetricSample[]>): Map<string, MetricSample[]> {
  for (const arr of map.values()) {
    arr.sort((a, b) => toDate(a.takenAt).getTime() - toDate(b.takenAt).getTime());
  }
  return map;
}

function collectSamples(dataset: PatientDataset): Map<string, MetricSample[]> {
  const map = new Map<string, MetricSample[]>();

  const push = (metric: string, sample: MetricSample | null | undefined) => {
    if (!sample) return;
    if (!map.has(metric)) map.set(metric, []);
    map.get(metric)!.push(sample);
  };

  for (const vital of dataset.vitals) {
    const expanded = expandVitalSamples(vital);
    for (const [metric, sample] of Object.entries(expanded)) push(metric, sample);
  }

  for (const lab of dataset.labs) {
    const normalized = normalizeLab(lab);
    if (normalized) push(normalized.metric, normalized.sample);
  }

  return sortSamples(map);
}

function buildMetricFeatures(samples: MetricSample[], now: Date): MetricFeatures {
  const windows: Record<string, WindowStats> = {};
  for (const days of WINDOWS) {
    windows[`${days}d`] = computeWindow(samples, days, now);
  }
  const latest = samples.length ? samples[samples.length - 1] : undefined;
  return { windows, latest };
}

function computeMedicationStats(dataset: PatientDataset, now: Date) {
  const nowTs = now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  let active = 0;
  let startedLast90 = 0;
  let adherenceIssues = 0;
  const BAD_MARKS = new Set(["missed", "nonadherent", "low", "skipped", "late", "stopped"]);

  for (const med of dataset.medications) {
    const start = med.start_at ? toDate(med.start_at) : null;
    const end = med.end_at ? toDate(med.end_at) : null;
    const isActive =
      (!!start ? start.getTime() <= nowTs : true) &&
      (!!end ? end.getTime() >= nowTs : true);
    if (isActive) active += 1;
    if (start && nowTs - start.getTime() <= 90 * dayMs) startedLast90 += 1;
    if (med.adherence_mark && BAD_MARKS.has(med.adherence_mark.toLowerCase())) adherenceIssues += 1;
  }

  return { active, startedLast90, adherenceIssues };
}

function computeEncounterStats(dataset: PatientDataset, now: Date) {
  let erVisits90 = 0;
  let inpatient365 = 0;
  let total365 = 0;
  const nowTs = now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const enc of dataset.encounters) {
    const at = toDate(enc.start_at);
    const diff = nowTs - at.getTime();
    if (diff < 0) continue;
    const days = diff / dayMs;
    if (days <= 365) total365 += 1;
    if (days <= 365 && enc.type && /inpatient|hospital/i.test(enc.type)) inpatient365 += 1;
    if (days <= 90 && enc.type && /er|ed|emergency/i.test(enc.type)) erVisits90 += 1;
  }

  return { erVisits90, inpatient365, total365 };
}

export function buildLongitudinalFeatures(dataset: PatientDataset, now = new Date()): LongitudinalFeatures {
  const samples = collectSamples(dataset);
  const metrics: Record<string, MetricFeatures> = {};
  for (const [metric, arr] of samples.entries()) {
    metrics[metric] = buildMetricFeatures(arr, now);
  }

  const noteFlags = extractNoteFlags(dataset.notes);

  return {
    generatedAt: now.toISOString(),
    metrics,
    medicationStats: computeMedicationStats(dataset, now),
    encounterStats: computeEncounterStats(dataset, now),
    noteFlags,
  };
}

export function latestSampleAgeInDays(features: MetricFeatures | undefined, now = new Date()): number | null {
  if (!features?.latest) return null;
  return daysBetween(now, toDate(features.latest.takenAt));
}

export function hasRecentMeasurement(features: MetricFeatures | undefined, maxDays: number, now = new Date()): boolean {
  const age = latestSampleAgeInDays(features, now);
  if (age == null) return false;
  return age <= maxDays;
}

export function getMetricValue(features: MetricFeatures | undefined, windowKey: string): number | undefined {
  if (!features) return undefined;
  const stats = features.windows[windowKey];
  return stats?.mean;
}

export function getSlope(features: MetricFeatures | undefined, windowKey: string): number | undefined {
  if (!features) return undefined;
  return features.windows[windowKey]?.slopePerDay;
}
