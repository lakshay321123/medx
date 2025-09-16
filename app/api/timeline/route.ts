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
  meta?: any;
};

type Event = {
  id: string;
  at: string;
  kind: string;
  value?: string | number;
  units?: string;
  source?: string | null;
};

const PRETTY: Record<string, string> = {
  hba1c: "HbA1c",
  tsh: "TSH",
  fsh: "FSH",
  uibc: "UIBC",
  ldl_cholesterol: "LDL-C",
  egfr: "eGFR",
  bmi: "BMI",
  hr: "Heart rate",
  bp: "Blood pressure",
};

function prettyKind(k?: string | null) {
  if (!k) return "Observation";
  const key = String(k).toLowerCase().replace(/\s+/g, "_");
  return PRETTY[key] || k.toUpperCase();
}

function ts(r: RawObs) {
  return r.observed_at || r.created_at || new Date().toISOString();
}

function val(r: RawObs) {
  return r.value_num ?? r.value_text ?? null;
}

export async function GET(req: NextRequest) {
  const supabase = createClient();

  const url = new URL(req.url);
  const patientId = url.searchParams.get("patientId") || url.searchParams.get("pid");
  const days = Math.max(1, Math.min(3650, Number(url.searchParams.get("days") || 365)));

  const { data: auth } = await supabase.auth.getUser();
  const sessionUserId = auth?.user?.id ?? null;
  const fallback = process.env.MEDX_TEST_USER_ID || null;
  const userId = sessionUserId || fallback;

  let q = supabase
    .from("observations")
    .select(
      "id,user_id,patient_id,thread_id,kind,value_num,value_text,units,observed_at,created_at,meta",
    )
    .order("observed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(500);

  if (patientId) q = q.eq("patient_id", patientId);
  else if (userId) q = q.eq("user_id", userId);

  q = q.or("meta->>committed.eq.true,meta->>committed.is.null");

  const since = new Date();
  since.setDate(since.getDate() - days);
  q = q.gte("created_at", since.toISOString());

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const events: Event[] = (data as RawObs[]).map((r) => ({
    id: r.id,
    at: ts(r),
    kind: prettyKind(r.kind),
    value: val(r) ?? undefined,
    units: r.units ?? undefined,
    source: r.thread_id ?? null,
  }));

  return NextResponse.json({ events });
}
