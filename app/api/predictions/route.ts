export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const patientId = url.searchParams.get("patientId");
  if (!patientId) return new NextResponse("Missing patientId", { status: 400 });

  const supa = supabaseAdmin();
  const { data: patient, error: patientErr } = await supa
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("user_id", userId)
    .maybeSingle();
  if (patientErr) return NextResponse.json({ error: patientErr.message }, { status: 500 });
  if (!patient) return new NextResponse("Not Found", { status: 404 });

  const { data, error } = await supa
    .from("predictions")
    .select("id, generated_at, condition, risk_score, risk_label, top_factors, model")
    .eq("patient_id", patientId)
    .order("generated_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const out = (data ?? []).map(r => ({
    id: r.id,
    generatedAt: r.generated_at,
    condition: r.condition,
    riskScore: r.risk_score,
    riskLabel: r.risk_label,
    topFactors: r.top_factors,
    model: r.model,
  }));
  return NextResponse.json(out);
}
