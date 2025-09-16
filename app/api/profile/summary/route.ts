export const runtime = "nodejs";
export const revalidate = 30;

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActivePatientId } from "@/lib/server/patientContext";
import {
  fetchPatientData,
  normalizeMeasurements,
  computeMeasurementFeatures,
  buildCoreMetricSnapshot,
} from "@/lib/server/predictionEngine";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
};

function parseArray(input: any): string[] {
  if (Array.isArray(input)) return input.filter(item => typeof item === "string");
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed.filter(item => typeof item === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

function roundNumber(value: number, precision = 3) {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function toRiskScore(value: any): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  if (value > 1 && value <= 100) return roundNumber(value / 100, 3);
  return roundNumber(value, 3);
}

function normalizeFactors(value: any): Array<{ name: string; detail: string }> {
  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (typeof item === "object" && item && typeof item.name === "string") {
          return {
            name: item.name,
            detail: typeof item.detail === "string" ? item.detail : "",
          };
        }
        if (Array.isArray(item) && item.length >= 2) {
          return { name: String(item[0]), detail: String(item[1] ?? "") };
        }
        return null;
      })
      .filter((item): item is { name: string; detail: string } => !!item);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeFactors(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeFeatures(value: any): Record<string, any> {
  if (value && typeof value === "object") return value as Record<string, any>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      return {};
    }
  }
  return {};
}

function deriveAge(dob?: string | null) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

async function fetchDemographics(patientId: string) {
  const supa = supabaseAdmin();
  const fallback = {
    id: patientId,
    fullName: null as string | null,
    dob: null as string | null,
    age: null as number | null,
    sex: null as string | null,
    bloodGroup: null as string | null,
    chronicConditions: [] as string[],
    predispositions: [] as string[],
  };

  try {
    const { data, error } = await supa
      .from("patients")
      .select("id, full_name, dob, sex, blood_group, blood_type, chronic_conditions, conditions_predisposition")
      .eq("id", patientId)
      .maybeSingle();
    if (!error && data) {
      const blood = (data.blood_group || data.blood_type || null) as string | null;
      return {
        id: data.id ?? patientId,
        fullName: data.full_name ?? null,
        dob: data.dob ?? null,
        age: deriveAge(data.dob),
        sex: data.sex ?? null,
        bloodGroup: blood,
        chronicConditions: parseArray(data.chronic_conditions),
        predispositions: parseArray(data.conditions_predisposition),
      };
    }
  } catch (err) {
    console.warn("profile summary: patients fetch failed", err);
  }

  try {
    const { data, error } = await supa
      .from("profiles")
      .select("id, full_name, dob, sex, blood_group, chronic_conditions, conditions_predisposition")
      .eq("id", patientId)
      .maybeSingle();
    if (!error && data) {
      return {
        id: data.id ?? patientId,
        fullName: data.full_name ?? null,
        dob: data.dob ?? null,
        age: deriveAge(data.dob),
        sex: data.sex ?? null,
        bloodGroup: data.blood_group ?? null,
        chronicConditions: parseArray(data.chronic_conditions),
        predispositions: parseArray(data.conditions_predisposition),
      };
    }
  } catch (err) {
    console.warn("profile summary: profiles fetch failed", err);
  }

  return fallback;
}

async function fetchLatestPredictions(patientId: string) {
  try {
    const supa = supabaseAdmin();
    const { data, error } = await supa
      .from("predictions")
      .select("*")
      .eq("patient_id", patientId)
      .order("generated_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);

    const latestByCondition = new Map<string, any>();
    for (const row of data ?? []) {
      const condition = row.condition ?? "Unknown";
      const current = latestByCondition.get(condition);
      const generatedAt = row.generated_at ?? row.created_at ?? null;
      if (!current) {
        latestByCondition.set(condition, { ...row, generated_at: generatedAt });
        continue;
      }
      const currentTs = new Date(current.generated_at ?? current.created_at ?? 0).getTime();
      const nextTs = new Date(generatedAt ?? 0).getTime();
      if (nextTs > currentTs) {
        latestByCondition.set(condition, { ...row, generated_at: generatedAt });
      }
    }

    return Array.from(latestByCondition.values())
      .map(row => {
        const riskScore = toRiskScore(row.risk_score);
        const topFactors = normalizeFactors(row.top_factors);
        const features = normalizeFeatures(row.features);
        const patientSummary = typeof row.patient_summary_md === "string"
          ? row.patient_summary_md
          : typeof row?.summaries?.patient_summary_md === "string"
          ? row.summaries.patient_summary_md
          : null;
        const clinicianSummary = typeof row.clinician_summary_md === "string"
          ? row.clinician_summary_md
          : typeof row?.summaries?.clinician_summary_md === "string"
          ? row.summaries.clinician_summary_md
          : null;
        const summaries = patientSummary || clinicianSummary ? {
          patient_summary_md: patientSummary,
          clinician_summary_md: clinicianSummary,
        } : null;
        return {
          id: row.id ?? null,
          condition: row.condition ?? "Unknown",
          riskScore,
          riskLabel: row.risk_label ?? "Unknown",
          topFactors,
          features,
          model: row.model ?? null,
          generatedAt: row.generated_at ?? row.created_at ?? null,
          summaries,
        };
      })
      .sort((a, b) => {
        const aTime = new Date(a.generatedAt ?? 0).getTime();
        const bTime = new Date(b.generatedAt ?? 0).getTime();
        return bTime - aTime;
      });
  } catch (err) {
    console.error("profile summary: predictions fetch failed", err);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const patientId = await getActivePatientId(req);

    const [demographics, predictions, rawData] = await Promise.all([
      fetchDemographics(patientId),
      fetchLatestPredictions(patientId),
      fetchPatientData(patientId),
    ]);

    const series = normalizeMeasurements(rawData);
    const features = computeMeasurementFeatures(series);
    const metrics = buildCoreMetricSnapshot(features);

    const response = {
      patient: demographics,
      metrics,
      predictions,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, { headers: CACHE_HEADERS });
  } catch (err: any) {
    console.error("/api/profile/summary failed", err);
    return NextResponse.json({ error: err?.message || "Failed to load profile" }, { status: 500 });
  }
}
