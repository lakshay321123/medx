export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { buildTimeSeriesFeatures, scoreRisk } from "@/lib/ai/predict";
import type { FeatureBuilderInput, PatientDemographics } from "@/types/prediction";

const errorResponse = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

const computeAge = (dob: unknown): number | null => {
  if (!dob) return null;
  const date = new Date(dob as any);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  if (diff <= 0) return null;
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
};

const normaliseSex = (value: unknown): string | null => {
  if (!value) return null;
  const str = String(value).trim().toLowerCase();
  if (!str) return null;
  if (["f", "female", "woman", "female_sex"].includes(str)) return "female";
  if (["m", "male", "man", "male_sex"].includes(str)) return "male";
  if (["nonbinary", "non-binary", "nb"].includes(str)) return "non-binary";
  return str;
};

const pickDemographics = (row: any): PatientDemographics | undefined => {
  if (!row) return undefined;
  const age = computeAge(row.dob ?? row.date_of_birth ?? row.birth_date ?? row.birthdate);
  const sex = normaliseSex(row.sex ?? row.gender ?? row.gender_identity);
  if (age == null && !sex) return undefined;
  return { age: age ?? undefined, sex: sex ?? undefined };
};

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return errorResponse("Supabase credentials are not configured", 500);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON payload", 400);
  }

  const patientId = body?.patientId ?? body?.patientID ?? body?.id;
  if (!patientId || typeof patientId !== "string") {
    return errorResponse("patientId is required", 400);
  }

  const sb = createClient(supabaseUrl, supabaseServiceKey);

  const [profileRes, vitalsRes, labsRes, medsRes, notesRes, encountersRes] = await Promise.all([
    sb.from("profiles").select("id, dob, sex, gender, gender_identity").eq("id", patientId).maybeSingle(),
    sb.from("vitals").select("*").eq("patient_id", patientId).order("taken_at", { ascending: true }),
    sb.from("labs").select("*").eq("patient_id", patientId).order("taken_at", { ascending: true }),
    sb.from("medications").select("*").eq("patient_id", patientId).order("start_at", { ascending: true }),
    sb.from("notes").select("*").eq("patient_id", patientId).order("created_at", { ascending: true }),
    sb.from("encounters").select("*").eq("patient_id", patientId).order("start_at", { ascending: true }),
  ]);

  const queryErrors = [vitalsRes.error, labsRes.error, medsRes.error, notesRes.error, encountersRes.error].filter(Boolean);
  if (queryErrors.length) {
    const err = queryErrors[0]!;
    return errorResponse(`Failed to fetch longitudinal data: ${err.message}`, 500);
  }
  if (profileRes.error && profileRes.error.message && profileRes.error.code !== "PGRST116") {
    return errorResponse(`Failed to fetch demographics: ${profileRes.error.message}`, 500);
  }

  const demographics = profileRes.data ? pickDemographics(profileRes.data) : undefined;

  const featureInput: FeatureBuilderInput = {
    vitals: vitalsRes.data ?? [],
    labs: labsRes.data ?? [],
    meds: medsRes.data ?? [],
    notes: notesRes.data ?? [],
    encounters: encountersRes.data ?? [],
    demographics,
  };

  const features = buildTimeSeriesFeatures(featureInput);
  const result = await scoreRisk(features);

  const persistRes = await sb.from("predictions").insert({
    patient_id: patientId,
    condition: result.condition,
    risk_score: result.riskScore,
    risk_label: result.riskLabel,
    features: result.windows,
    top_factors: result.topFactors,
    context: result.context ?? null,
    generated_at: result.generatedAt,
  });

  if (persistRes.error) {
    return errorResponse(`Failed to persist prediction: ${persistRes.error.message}`, 500);
  }

  return NextResponse.json(result);
}
