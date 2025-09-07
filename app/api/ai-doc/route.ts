import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { prisma } from "@/lib/prisma";
import { getAiDocMem, upsertMem } from "@/lib/aidoc/memory";
import { buildAiDocSystem } from "@/lib/aidoc/prompt";
import { AIDOC_JSON_INSTRUCTION } from "@/lib/aidoc/schema";
import { callOpenAIJson } from "@/lib/aidoc/vendor";

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { threadId, message } = await req.json();

  const profile = await prisma.patientProfile.upsert({ where:{userId}, update:{}, create:{userId} });
  const [labs, meds, conditions, mem] = await Promise.all([
    prisma.labResult.findMany({ where:{ profileId: profile.id }}),
    prisma.medication.findMany({ where:{ profileId: profile.id }}),
    prisma.condition.findMany({ where:{ profileId: profile.id }}),
    getAiDocMem(threadId),
  ]);

  const system = buildAiDocSystem({ profile, labs, meds, conditions, mem });
  const out = await callOpenAIJson({ system, user: message, instruction: AIDOC_JSON_INSTRUCTION });

  // Persist SAVES
  for (const m of out.save?.medications ?? []) {
    const row = await prisma.medication.create({ data: { profileId: profile.id, name:m.name, dose:m.dose||null, route:m.route||null, freq:m.freq||null, startedAt:m.startedAt?new Date(m.startedAt):null }});
    await prisma.timelineEvent.create({ data:{ profileId: profile.id, at:new Date(), type:m.startedAt?"med_start":"note", refId: row.id, summary:`Started ${m.name} ${m.dose||""}`.trim() }});
  }
  for (const c of out.save?.conditions ?? []) {
    const row = await prisma.condition.create({ data: { profileId: profile.id, code:c.code||c.label, label:c.label, status:c.status||"active", since:c.since?new Date(c.since):null }});
    await prisma.timelineEvent.create({ data:{ profileId: profile.id, at:new Date(), type:"diagnosis", refId: row.id, summary:c.label }});
  }
  for (const l of out.save?.labs ?? []) {
    const row = await prisma.labResult.create({ data: { profileId: profile.id, panel:l.panel||"Manual", name:l.name, value:l.value??null, unit:l.unit||null, refLow:l.refLow??null, refHigh:l.refHigh??null, abnormal:l.abnormal??null, takenAt:l.takenAt?new Date(l.takenAt):new Date() }});
    await prisma.timelineEvent.create({ data:{ profileId: profile.id, at:new Date(), type:"lab", refId: row.id, summary:`${l.name}: ${l.value??""}${l.unit??""}`.trim() }});
  }
  for (const n of out.save?.notes ?? []) {
    await prisma.timelineEvent.create({ data:{ profileId: profile.id, at:new Date(), type:"note", summary:`${n.type}: ${n.key} – ${n.value}` }});
  }
  for (const p of out.save?.prefs ?? []) {
    await upsertMem(threadId, "aidoc.pref", p.key, p.value);
  }

  // Recompute alerts so Alerts panel isn’t empty when it shouldn’t be
  await fetch(new URL("/api/alerts/recompute", req.url), { method:"POST", headers:{ cookie: req.headers.get("cookie") || "" } }).catch(()=>{});

  return NextResponse.json({
    reply: out.reply,
    observations: out.observations
  });
}

