export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

const noStore = { "Cache-Control": "no-store, max-age=0" };
const LAB_KEYS = {
  hba1c: /hba1c/i,
  fpg: /fasting_glucose|fpg|fbs/i,
  egfr: /egfr/i,
  lipids: /ldl|hdl|triglycerides|total_cholesterol/i,
  tsh: /tsh/i,
  vitd: /vitamin_d/i,
};

export function computeReadiness(profile: any, obs: any[]) {
  let score = 0;
  const missing: string[] = [];
  const suggested: string[] = [];

  const hasPred = Array.isArray(profile?.conditions_predisposition) && profile.conditions_predisposition.length > 0;
  if (hasPred) score += 10; else missing.push('family_history');

  const meds = obs.some(o => Array.isArray(o.meta?.meds) && o.meta.meds.length);
  if (meds) score += 20; else missing.push('medications');

  const labsSeen = new Set<string>();
  for (const o of obs) {
    const k = `${o.kind} ${o.name}`.toLowerCase();
    for (const [key, rx] of Object.entries(LAB_KEYS)) if (rx.test(k)) labsSeen.add(key);
  }
  if (labsSeen.size >= 3) score += 20; else missing.push('labs');
  const missingLabs = Object.keys(LAB_KEYS).filter(k => !labsSeen.has(k));
  suggested.push(...missingLabs.map(k => k.toUpperCase()));

  const weight = obs.filter(o => /weight|bmi/i.test(`${o.kind} ${o.name}`)).sort((a,b)=> +new Date(b.observed_at) - +new Date(a.observed_at))[0];
  if (weight && (Date.now() - new Date(weight.observed_at).getTime())/86400000 < 30) score += 10; else missing.push('recent_weight');

  const hasDoctor = obs.some(o => /summary/i.test(`${o.name} ${o.meta?.kind || ''}`));
  if (hasDoctor) score += 10; else missing.push('doctor_summary');

  return { score, missing, suggested_tests: suggested };
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const sb = supabaseAdmin();
  const [p, o] = await Promise.all([
    sb.from('profiles').select('conditions_predisposition').eq('id', userId).maybeSingle(),
    sb.from('observations').select('kind,name,observed_at,meta').eq('user_id', userId),
  ]);
  const readiness = computeReadiness(p.data || {}, o.data || []);
  return NextResponse.json(readiness, { headers: noStore });
}
