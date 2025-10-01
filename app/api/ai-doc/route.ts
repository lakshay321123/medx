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
import { supabaseAdmin } from "@/lib/supabase/admin";
import { extractAll, canonicalizeInputs } from "@/lib/medical/engine/extract";
import { computeAll } from "@/lib/medical/engine/computeAll";
import {
  languageDirectiveFor,
  personaFromPrefs,
  sanitizePersonalization,
  SYSTEM_DEFAULT_LANG,
} from "@/lib/prompt/system";
// === [MEDX_CALC_ROUTE_IMPORTS_START] ===
// === [MEDX_CALC_ROUTE_IMPORTS_END] ===

async function getFeedbackSummary(conversationId: string) {
  try {
    const db = supabaseAdmin();
    const { data } = await db
      .from("ai_feedback")
      .select("rating")
      .eq("conversation_id", conversationId)
      .limit(1000);
    const up = (data ?? []).filter((r) => r.rating === 1).length;
    const down = (data ?? []).filter((r) => r.rating === -1).length;
    return { up, down };
  } catch {
    return { up: 0, down: 0 };
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { threadId, message, profileIntent, newProfile, personalization, lang: langTag } = body;
  const allowHistory = body?.allowHistory !== false;
  const headerLang = req.headers.get("x-user-lang") || req.headers.get("x-lang") || undefined;
  const requestedLang =
    typeof langTag === "string" && langTag.trim()
      ? langTag
      : typeof headerLang === "string" && headerLang.trim()
      ? headerLang
      : SYSTEM_DEFAULT_LANG;
  const lang = requestedLang.trim().toLowerCase();
  const sanitized = sanitizePersonalization(personalization);
  const sysPrelude = [languageDirectiveFor(lang), personaFromPrefs(sanitized)]
    .filter(Boolean)
    .join("\n\n");
  if (!message) return NextResponse.json({ error: "no message" }, { status: 400 });

  // Ensure profile & load clinical state + memory
  let profile = await prisma.patientProfile.findFirst({ where: { userId } });

  // New patient quick-create (only for this call)
  if (profileIntent === "new") {
    const p = await prisma.patientProfile.create({
      data: {
        userId,
        name: (newProfile?.name || "New Patient").slice(0, 80),
        age: newProfile?.age ? Number(newProfile.age) : null,
        sex: newProfile?.sex || null,
        pregnant:
          newProfile?.pregnant === "yes"
            ? true
            : newProfile?.pregnant === "no"
            ? false
            : null,
      } as any,
    });
    profile = p;

    // seed basic notes/meds from intake if provided
    const ops: any[] = [];
    if (newProfile?.symptoms)
      ops.push(
        prisma.note.create({
          data: { profileId: p.id, body: `Symptoms: ${newProfile.symptoms}` },
        }),
      );
    if (newProfile?.allergies)
      ops.push(
        prisma.note.create({
          data: { profileId: p.id, body: `Allergies: ${newProfile.allergies}` },
        }),
      );
    if (newProfile?.meds) {
      const meds = String(newProfile.meds)
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const m of meds)
        ops.push(prisma.medication.create({ data: { profileId: p.id, name: m } }));
    }
    if (ops.length) await prisma.$transaction(ops);
  }

  if (!profile) {
    const p = await prisma.patientProfile.create({
      data: { userId, name: "New Patient" } as any,
    });
    profile = p;
  }

  const [labs, meds, conditions, mem] = await Promise.all([
    prisma.labResult.findMany({ where: { profileId: profile.id } }),
    prisma.medication.findMany({ where: { profileId: profile.id } }),
    prisma.condition.findMany({ where: { profileId: profile.id } }),
    getMemByThread(threadId || ""),
  ]);

  // Opportunistically capture preferences from user's message
  if (allowHistory) {
    for (const p of extractPrefsFromUser(message)) {
      await upsertMem(threadId, "aidoc.pref", p.key, p.value);
      await prisma.timelineEvent.create({
        data: {
          profileId: profile.id,
          at: new Date(),
          type: "preference",
          summary: `Saved preference: ${p.key} = ${p.value}`,
        },
      });
    }
  }

  // System prompt with guardrails
  let system = buildAiDocPrompt({ profile, labs, meds, conditions });
  if (sysPrelude) {
    system = [sysPrelude, system].filter(Boolean).join("\n\n");
  }

  const userText = String(message || "");
  const ctx = canonicalizeInputs(extractAll(userText));
  const computed = computeAll(ctx);
  // Curate what we surface to the model: top, relevant items only.
  const CRIT_IDS = new Set([
    "anion_gap",
    "anion_gap_corrected",
    "delta_ratio_ag",
    "winters_expected_paco2",
    "sodium_status",
    "serum_osmolality",
    "effective_osmolality",
    "osmolal_gap",
    "ada_k_guard",
    "dka_flag",
    "hhs_flag",
    "lactate_status",
  ]);

  const byId: Record<string, any> = {};
  for (const r of computed) if (CRIT_IDS.has(r.id)) byId[r.id] = r;

  const lines: string[] = [];

  // Acid–base headline
  const ag = byId["anion_gap"];
  const agc = byId["anion_gap_corrected"];
  const dr = byId["delta_ratio_ag"];
  if (ag) {
    let line = `HAGMA: AG ${ag.value}`;
    if (agc) line += ` (corr ${agc.value})`;
    if (dr?.notes?.length) line += `; ${dr.notes.join("; ")}`;
    lines.push(line);
  }

  // Acidemia driver + Winter’s
  const HCO3 = (ctx as any).HCO3;
  const winter = byId["winters_expected_paco2"];
  const pco2 = (ctx as any).pCO2 ?? (ctx as any).PaCO2 ?? null; // canonical + legacy
  if (HCO3 != null && winter) {
    let line = `Acidemia driver: HCO₃ ${HCO3}`;
    line += `; Winter’s exp pCO₂ ${winter.value} (±2)`;
    if (pco2 != null) line += ` vs actual ${Math.round(pco2 * 10) / 10}`;
    lines.push(line);
  }

  // Glucose + corrected sodium
  const glucose = (ctx as any).glucose_mgdl;
  const sodium = byId["sodium_status"];
  if (glucose != null && sodium) {
    const trans = sodium.notes?.find((n: string) => n.toLowerCase().includes("translocational"));
    let line = `Glucose ${glucose}; Corrected Na ${sodium.value}`;
    if (trans) line += ` — ${trans}`;
    lines.push(line);
  }

  // Potassium guard
  const kGuard = byId["ada_k_guard"];
  if (kGuard) {
    const note = kGuard.notes?.[0] ?? "";
    lines.push(`K ${kGuard.value} — ${note}`);
  }

  // Lactate
  const lactate = byId["lactate_status"];
  if (lactate) {
    const note = lactate.notes?.[0] ?? "";
    lines.push(`Lactate ${lactate.value} — ${note}`);
  }

  // Osmolality block (canonical + legacy fallbacks)
  const osmCalc = byId["serum_osmolality"];
  const measuredOsm =
    (ctx as any).Osm_measured ??
    (ctx as any).measured_osm ??
    (ctx as any).osm_meas ??
    null;
  const osmGap = byId["osmolal_gap"];
  if (osmCalc || measuredOsm != null || osmGap) {
    let line = "Osm:";
    if (osmCalc) line += ` calc ${osmCalc.value}`;
    if (measuredOsm != null) line += ` / measured ${measuredOsm}`;
    if (osmGap) line += `; gap ${osmGap.value}`;
    lines.push(line);
  }

  // DKA/HHS gates
  const dka = byId["dka_flag"];
  const hhs = byId["hhs_flag"];
  if (dka || hhs) {
    const toNum = (r: any) => (r?.value === "yes" ? 1 : 0);
    lines.push(`Gate(s): DKA ${toNum(dka)}; HHS ${toNum(hhs)}`);
  }

  const curatedLines = lines.join("\n");

  // Build final system: curated block + your base prompt (no raw full dump)
  system = [
    "Use only the pre-computed clinical values below when directly relevant. Do not list other scores unless asked.",
    curatedLines,
    String(system || ""),
  ]
    .filter(Boolean)
    .join("\n");

  // Call LLM (JSON-only)
  const feedback_summary = await getFeedbackSummary(threadId || "");
  const out = await callOpenAIJson({
    system,
    user: message,
    instruction: "Return JSON with {reply, save:{medications,conditions,labs,notes,prefs}, observations:{short,long}}",
    metadata: {
      conversationId: threadId,
      lastMessageId: null,
      feedback_summary,
      app: "medx",
      mode: "ai-doc",
    },
  });

  let memAfter = mem;
  if (allowHistory) {
    for (const p of out?.save?.prefs ?? []) {
      await upsertMem(threadId, "aidoc.pref", p.key, String(p.value));
      await prisma.timelineEvent.create({
        data: {
          profileId: profile.id,
          at: new Date(),
          type: "preference",
          summary: `Saved preference: ${p.key} = ${p.value}`,
        },
      });
    }

    const save = out?.save || {};
    await prisma.$transaction(async (tx) => {
      // CONDITIONS
      for (const c of save.conditions ?? []) {
        const existing = await tx.condition.findFirst({
          where: { profileId: profile.id, label: c.label, status: (c.status as any) ?? "active" },
        });
        if (existing) {
          await tx.condition.update({
            where: { id: existing.id },
            data: { code: c.code ?? existing.code, since: c.since ?? existing.since },
          });
        } else {
          const row = await tx.condition.create({
            data: {
              profileId: profile.id,
              label: c.label,
              status: (c.status as any) ?? "active",
              code: c.code ?? null,
              since: c.since ?? null,
            },
          });
          await tx.timelineEvent.create({
            data: { profileId: profile.id, at: new Date(), type: "diagnosis", refId: row.id, summary: c.label },
          });
        }
      }

      // MEDICATIONS
      for (const m of save.medications ?? []) {
        const existing = await tx.medication.findFirst({
          where: { profileId: profile.id, name: m.name, dose: m.dose ?? null, stoppedAt: null },
        });
        if (existing) {
          await tx.medication.update({
            where: { id: existing.id },
            data: { since: m.since ?? existing.since },
          });
        } else {
          const row = await tx.medication.create({
            data: {
              profileId: profile.id,
              name: m.name,
              dose: m.dose ?? null,
              since: m.since ?? null,
              stoppedAt: m.stoppedAt ?? null,
            },
          });
          await tx.timelineEvent.create({
            data: {
              profileId: profile.id,
              at: new Date(),
              type: "med_start",
              refId: row.id,
              summary: (`Started ${m.name} ${m.dose || ""}`).trim(),
            },
          });
        }
      }

      // LABS
      for (const l of save.labs ?? []) {
        const takenAt = l.takenAt ? new Date(l.takenAt) : null;
        const existing = await tx.labResult.findFirst({
          where: { profileId: profile.id, name: l.name, takenAt },
        });
        if (existing) {
          await tx.labResult.update({
            where: { id: existing.id },
            data: {
              value: (l as any).value ?? existing.value,
              unit: l.unit ?? existing.unit,
              refLow: (l as any).normalLow ?? existing.refLow,
              refHigh: (l as any).normalHigh ?? existing.refHigh,
              abnormal: (l as any).abnormal ?? existing.abnormal,
            },
          });
        } else {
          const row = await tx.labResult.create({
            data: {
              profileId: profile.id,
              panel: l.panel ?? null,
              name: l.name,
              value: (l as any).value ?? null,
              unit: l.unit ?? null,
              refLow: (l as any).normalLow ?? null,
              refHigh: (l as any).normalHigh ?? null,
              takenAt,
              abnormal: (l as any).abnormal ?? null,
            },
          });
          await tx.timelineEvent.create({
            data: {
              profileId: profile.id,
              at: new Date(),
              type: "lab",
              refId: row.id,
              summary: (`${l.name}: ${l.value ?? ""}${l.unit ?? ""}`).trim(),
            },
          });
        }
      }

      // NOTES
      for (const note of save.notes ?? []) {
        const row = await tx.note.create({ data: { profileId: profile.id, body: note } });
        await tx.timelineEvent.create({
          data: { profileId: profile.id, at: new Date(), type: "note", refId: row.id, summary: note },
        });
      }

      // PREFS
      for (const p of save.prefs ?? []) {
        const existing = await tx.preference.findFirst({ where: { profileId: profile.id, key: p.key } });
        if (existing) {
          await tx.preference.update({ where: { id: existing.id }, data: { value: p.value } });
        } else {
          await tx.preference.create({ data: { profileId: profile.id, key: p.key, value: p.value } });
        }
      }
    });

    memAfter = await getMemByThread(threadId || "");
  }

  // Personalization via rule engine
  const ruled = runRules({ labs, meds, conditions, mem: memAfter });
  const plan = buildPersonalPlan(ruled, memAfter, { symptomsText: message });

  if (allowHistory) {
    // Keep core alerts fresh (stale/abnormal)
    await fetch(new URL("/api/alerts/recompute", req.url), {
      method: "POST",
      headers: { cookie: req.headers.get("cookie") || "" },
    }).catch(() => {});

    // Log which rules fired
    await prisma.timelineEvent.create({
      data: {
        profileId: profile.id,
        at: new Date(),
        type: "ai_reason",
        summary: `Rules: ${plan.rulesFired.join(", ")}`,
        details: JSON.stringify({ rules: plan.rulesFired }),
      },
    });
  }

  return NextResponse.json({
    reply: out.reply,
    observations: out.observations,
    plan,
    softAlerts: plan.softAlerts,
    rulesFired: plan.rulesFired,
    alertsCreated: 0,
  });
}
