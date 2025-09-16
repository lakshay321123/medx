// app/api/timeline/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RawObs = {
  id: string;
  user_id: string | null;
  patient_id?: string | null;
  thread_id?: string | null;
  kind: string | null;
  value_num?: number | null;
  value_text?: string | null;
  units?: string | null;
  observed_at?: string | null;
  created_at?: string | null;
};

type Event = {
  id: string;
  at: string; // ISO date
  kind: string;
  value?: string | number;
  units?: string;
  source?: string | null; // thread_id
};

const pretty: Record<string, string> = {
  hbA1c: "HbA1c",
  hba1c: "HbA1c",
  tsh: "TSH",
  fsh: "FSH",
  uibc: "UIBC",
  ldl_cholesterol: "LDL-C",
  urine_physical_quantity: "Urine (physical)",
  conjugated_bilirubin: "Conjugated Bilirubin",
  egfr: "eGFR",
  bmi: "BMI",
  hr: "Heart rate",
  bp: "Blood pressure",
};

function labelKind(k?: string | null) {
  if (!k) return "Observation";
  const key = String(k).toLowerCase().replace(/\s+/g, "_");
  return pretty[key] || k.toUpperCase();
}

function coalesceTime(r: RawObs) {
  return r.observed_at || r.created_at || new Date().toISOString();
}

function coalesceValue(r: RawObs) {
  return r.value_num ?? r.value_text ?? null;
}

export async function GET(req: NextRequest) {
  const supabase = createClient();

  // who is calling?
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user ?? null;

  const url = new URL(req.url);
  const patientId = url.searchParams.get("patientId") || url.searchParams.get("pid");
  const days = Math.max(1, Math.min(3650, Number(url.searchParams.get("days") || 365)));

  // Build base query
  let q = supabase
    .from("observations")
    .select(
      "id,user_id,patient_id,thread_id,kind,value_num,value_text,units,observed_at,created_at",
    )
    .order("observed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(500); // enough for the panel

  if (patientId) {
    q = q.eq("patient_id", patientId);
  } else if (user?.id) {
    q = q.eq("user_id", user.id);
  }

  // Optional server-side time window filter
  const since = new Date();
  since.setDate(since.getDate() - days);
  q = q.gte("created_at", since.toISOString());

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const events: Event[] = (data as RawObs[]).map((r) => ({
    id: r.id,
    at: coalesceTime(r),
    kind: labelKind(r.kind),
    value: coalesceValue(r) ?? undefined,
    units: r.units ?? undefined,
    source: r.thread_id ?? null,
  }));

  return NextResponse.json({ events });
}
