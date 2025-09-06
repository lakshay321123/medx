export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const sb = supabaseAdmin();
  const [pRes, oRes] = await Promise.all([
    sb.from("profiles").select("conditions_predisposition").eq("id", userId).maybeSingle(),
    sb.from("observations").select("*").eq("user_id", userId),
  ]);

  const asArray = (x: any) => Array.isArray(x) ? x : (typeof x === "string" ? (()=>{ try{ const p=JSON.parse(x); return Array.isArray(p)?p:[] } catch { return [] } })() : []);
  const predis = asArray(pRes.data?.conditions_predisposition || []);

  const obs: any[] = oRes.data || [];
  const now = Date.now();
  const latest = (k: string) => obs.filter(r => (r.kind||"").toLowerCase() === k).sort((a,b)=>new Date(b.observed_at||b.created_at).getTime()-new Date(a.observed_at||a.created_at).getTime())[0];

  // meds exist if we have any explicit medication observation OR any observation meta lists meds
  const anyMed = obs.some(r => (r.kind||"").toLowerCase()==='medication' || /meds|medicines|medications/.test(JSON.stringify(r.meta||{})));

  const w = latest('weight');
  const wDays = w ? Math.floor((now - new Date(w.observed_at || w.created_at).getTime()) / (1000*60*60*24)) : Infinity;

  const missing: string[] = [];
  if (predis.length === 0) missing.push('predispositions');
  if (!anyMed)            missing.push('medications');
  if (wDays > 30)         missing.push('weight');

  const readiness =  (predis.length>0 ? 34 : 0) + (anyMed ? 33 : 0) + (wDays<=30 ? 33 : 0);
  return NextResponse.json({ readiness, missing, stale: { weightDays: isFinite(wDays) ? wDays : null } });
}
