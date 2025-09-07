export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { prisma } from "@/lib/prisma";
import { callOpenAIJson } from "@/lib/aidoc/vendor";
import { getMemByThread, upsertMem } from "@/lib/aidoc/memory";
import { runRules } from "@/lib/aidoc/rules";
import { buildPersonalPlan } from "@/lib/aidoc/planner";
import { extractPrefsFromUser } from "@/lib/aidoc/extractors/prefs";
import { buildAiDocPrompt } from "@/lib/ai/prompts/aidoc";

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { threadId, message } = await req.json();
  if (!message) return NextResponse.json({ error: "no message" }, { status: 400 });

  // Ensure profile & load clinical state + memory
  const profile = await prisma.patientProfile.upsert({ where: { userId }, update: {}, create: { userId } });
  const [labs, meds, conditions, mem] = await Promise.all([
    prisma.labResult.findMany({ where: { profileId: profile.id } }),
    prisma.medication.findMany({ where: { profileId: profile.id } }),
    prisma.condition.findMany({ where: { profileId: profile.id } }),
    getMemByThread(threadId || ""),
  ]);

  // Opportunistically capture preferences from user's message
  for (const p of extractPrefsFromUser(message)) {
    await upsertMem(threadId, "aidoc.pref", p.key, p.value);
    await prisma.timelineEvent.create({
      data: { profileId: profile.id, at:new Date(), type:"preference", summary:`Saved preference: ${p.key} = ${p.value}` }
    });
  }

  // System prompt with guardrails
  const system = buildAiDocPrompt({ profile, labs, meds, conditions });

  // Call LLM (JSON-only)
  const out = await callOpenAIJson({
    system,
    user: message,
    instruction: "Return JSON with {reply, save:{medications,conditions,labs,notes,prefs}, observations:{short,long}}"
  });

  // Persist structured saves + timeline
  for (const p of out?.save?.prefs ?? []) {
    await upsertMem(threadId, "aidoc.pref", p.key, String(p.value));
    await prisma.timelineEvent.create({
      data: { profileId: profile.id, at:new Date(), type:"preference", summary:`Saved preference: ${p.key} = ${p.value}` }
    });
  }
  for (const m of out?.save?.medications ?? []) {
    const row = await prisma.medication.create({
      data: { profileId: profile.id, name:m.name, dose:m.dose||null, route:m.route||null, freq:m.freq||null, startedAt:m.startedAt?new Date(m.startedAt):null }
    });
    await prisma.timelineEvent.create({
      data: { profileId: profile.id, at:new Date(), type:"med_start", refId: row.id, summary:`Started ${m.name} ${m.dose||""}`.trim() }
    });
  }
  for (const c of out?.save?.conditions ?? []) {
    const row = await prisma.condition.create({
      data: { profileId: profile.id, code:c.code||c.label, label:c.label, status:c.status||"active", since:c.since?new Date(c.since):null }
    });
    await prisma.timelineEvent.create({
      data: { profileId: profile.id, at:new Date(), type:"diagnosis", refId: row.id, summary:c.label }
    });
  }
  for (const l of out?.save?.labs ?? []) {
    const row = await prisma.labResult.create({
      data: { profileId: profile.id, panel:l.panel||"Manual", name:l.name, value:l.value??null, unit:l.unit||null, refLow:l.refLow??null, refHigh:l.refHigh??null, abnormal:l.abnormal??null, takenAt:l.takenAt?new Date(l.takenAt):new Date() }
    });
    await prisma.timelineEvent.create({
      data: { profileId: profile.id, at:new Date(), type:"lab", refId: row.id, summary:`${l.name}: ${l.value??""}${l.unit??""}`.trim() }
    });
  }
  for (const n of out?.save?.notes ?? []) {
    await prisma.timelineEvent.create({
      data: { profileId: profile.id, at:new Date(), type:"note", summary:`${n.type}: ${n.key} – ${n.value}` }
    });
  }

  // Personalization via rule engine
  const memAfter = await getMemByThread(threadId || "");
  const ruled = runRules({ labs, meds, conditions, mem: memAfter });
  const plan = buildPersonalPlan(ruled, memAfter);

  // Keep core alerts fresh (stale/abnormal)
  await fetch(new URL("/api/alerts/recompute", req.url), { method:"POST", headers:{ cookie: req.headers.get("cookie") || "" } }).catch(()=>{});

  // Log which rules fired
  await prisma.timelineEvent.create({
    data: { profileId: profile.id, at:new Date(), type:"ai_reason", summary:`Rules: ${plan.rulesFired.join(", ")}`, details: JSON.stringify({ rules: plan.rulesFired }) }
  });

  return NextResponse.json({
    reply: out.reply,
    observations: out.observations,
    plan,
    alertsCreated: 0
  });
}
