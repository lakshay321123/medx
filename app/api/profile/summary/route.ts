export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ summary:"", reasons:"" }, { headers: noStore });

  const supa = supabaseAdmin();
  const [prof, obs, preds] = await Promise.all([
    supa.from("profiles").select("full_name, dob, sex, blood_group, conditions_predisposition, chronic_conditions").eq("id", userId).maybeSingle(),
    supa.from("observations").select("*").eq("user_id", userId),
    supa.from("predictions").select("*").eq("user_id", userId),
  ]);
  if (prof.error) return NextResponse.json({ summary:"", reasons:"" }, { headers: noStore });

  const p = prof.data || {};
  const labs = (obs.data||[]).filter((r:any)=>{
    const s = `${(r.name||"").toLowerCase()} ${JSON.stringify(r.meta||{}).toLowerCase()}`;
    return /(hba1c|glucose|egfr|creatinine|tsh|hdl|ldl|triglycer|cholesterol|urea)/.test(s);
  });

  const lines:string[] = [];
  if (p.full_name) lines.push(`Patient: ${p.full_name}`);
  if (p.sex || p.blood_group) lines.push([p.sex, p.blood_group?`Blood group ${p.blood_group}`:null].filter(Boolean).join(" · "));
  if (Array.isArray(p.chronic_conditions) && p.chronic_conditions.length) lines.push(`Chronic: ${p.chronic_conditions.join(", ")}`);
  if (Array.isArray(p.conditions_predisposition) && p.conditions_predisposition.length) lines.push(`Predispositions: ${p.conditions_predisposition.join(", ")}`);

  const lastHbA1c = pickLatest(labs, /hba1c/);
  const lastGluc  = pickLatest(labs, /(fpg|glucose)/);
  const lastTSH   = pickLatest(labs, /tsh/);

  if (lastHbA1c) lines.push(`Latest HbA1c: ${valStr(lastHbA1c)}`);
  if (lastGluc)  lines.push(`Glucose: ${valStr(lastGluc)}`);
  if (lastTSH)   lines.push(`TSH: ${valStr(lastTSH)}`);

  const topPred = (preds.data||[]).map((r:any)=>{
    const d=r.details??r.meta??{};
    const name=r.name??d.label??d.name??"Model prediction";
    const prob= typeof r.probability==="number"?r.probability:
                typeof d?.fractured==="number"?d.fractured:
                typeof d?.probability==="number"?d.probability:null;
    return { name, prob };
  }).sort((a,b)=>(b.prob??0)-(a.prob??0))[0];

  if (topPred?.name) lines.push(`AI risk focus: ${topPred.name}${typeof topPred.prob==="number" ? ` (${Math.round(topPred.prob*100)}%)` : ""}`);

  const summary = lines.join("\n");

  const reasons = [
    lastHbA1c ? `HbA1c ${valStr(lastHbA1c)}` : null,
    lastGluc  ? `Glucose ${valStr(lastGluc)}` : null,
    lastTSH   ? `TSH ${valStr(lastTSH)}` : null,
    topPred?.name ? `Prediction signal: ${topPred.name}` : null
  ].filter(Boolean).join("; ");

  return NextResponse.json({ summary, reasons }, { headers: noStore });
}

function pickLatest(list:any[], rx:RegExp){
  const f = list.filter((r:any)=>{
    const s = `${(r.name||"").toLowerCase()} ${JSON.stringify(r.meta||{}).toLowerCase()}`;
    return rx.test(s);
  }).sort((a:any,b:any)=> new Date(b.observed_at||b.created_at||0).getTime() - new Date(a.observed_at||a.created_at||0).getTime());
  return f[0];
}
function valStr(r:any){
  const v = r.value ?? r.meta?.value ?? "?"; const u = r.unit ?? r.meta?.unit ?? "";
  return `${v}${u?` ${u}`:""}`;
}
