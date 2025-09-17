export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { callOpenAIJson } from "@/lib/aidoc/vendor";
import { getMemByThread, upsertMem } from "@/lib/aidoc/memory";
import { runRules } from "@/lib/aidoc/rules";
import { buildPersonalPlan } from "@/lib/aidoc/planner";
import { extractPrefsFromUser } from "@/lib/aidoc/extractors/prefs";
import { buildAiDocPrompt } from "@/lib/ai/prompts/aidoc";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { extractAll, canonicalizeInputs } from "@/lib/medical/engine/extract";
import { computeAll } from "@/lib/medical/engine/computeAll";
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

const LAB_HINTS = [
  "glucose",
  "cholesterol",
  "triglycer",
  "hba1c",
  "egfr",
  "creatinine",
  "bun",
  "bilirubin",
  "ast",
  "alt",
  "alp",
  "ggt",
  "hb",
  "hemoglobin",
  "wbc",
  "platelet",
  "esr",
  "ferritin",
  "tibc",
  "uibc",
  "transferrin",
  "sodium",
  "potassium",
  "vitamin",
  "lipase",
  "amylase",
  "fsh",
  "lh",
  "rheumatoid",
];
const MED_HINTS = ["med", "rx", "drug", "dose", "tablet", "capsule", "syrup", "injection"];
const CONDITION_HINTS = ["diagnosis", "condition", "problem", "disease", "icd", "impression"];
const VITAL_HINTS = ["bp", "blood_pressure", "heart_rate", "hr", "pulse", "spo2", "oxygen", "resp", "rr", "temperature", "temp"];

type ClinicalState = {
  labs: any[];
  meds: any[];
  conditions: any[];
  vitals: { sbp?: number; hr?: number; spo2?: number; temp?: number };
};

function normalizeIso(input?: any): string {
  if (!input) return new Date().toISOString();
  const d = new Date(input);
  return Number.isFinite(d.getTime()) ? d.toISOString() : new Date().toISOString();
}

function parseNumber(value: any): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function asStringArray(input: any): string[] {
  if (Array.isArray(input)) {
    return input
      .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
      .filter(Boolean);
  }
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
          .filter(Boolean);
      }
    } catch {
      // fall back to comma/newline separation for plain strings
      return input
        .split(/[,\n;]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function normalizePregnancy(input: any): "yes" | "no" | "unsure" | null {
  if (input == null) return null;
  if (typeof input === "boolean") return input ? "yes" : "no";
  const text = String(input).trim().toLowerCase();
  if (!text) return null;
  if (["yes", "y", "true", "pregnant", "positive"].includes(text)) return "yes";
  if (["no", "n", "false", "not pregnant", "negative"].includes(text)) return "no";
  if (["not sure", "unsure", "unknown", "maybe"].includes(text)) return "unsure";
  return null;
}

function clampAgeYears(input: any): number | null {
  const num = parseNumber(input);
  if (num == null) return null;
  if (num < 0 || num > 130) return null;
  return Math.round(num);
}

function computeAgeFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (!Number.isFinite(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

function buildPromptProfile(row: any, overrides?: any) {
  const name = (overrides?.name || row?.full_name || row?.name || "New Patient").toString();
  const dobAge = computeAgeFromDob(row?.dob ?? null);
  const ageRaw = overrides?.age ?? row?.age ?? dobAge;
  const age = ageRaw == null ? null : Number(ageRaw);
  const sex = overrides?.sex ?? row?.sex ?? null;
  let pregnant: any = overrides?.pregnant ?? row?.pregnant ?? null;
  if (typeof pregnant === "string") {
    const p = pregnant.toLowerCase();
    if (["yes", "true", "y"].includes(p)) pregnant = "yes";
    else if (["no", "false", "n"].includes(p)) pregnant = "no";
  }
  return {
    name,
    age: Number.isFinite(age) ? Number(age) : null,
    sex: sex ?? null,
    pregnant: pregnant ?? null,
  };
}

function buildClinicalState(obsRows: any[], predRows: any[]): ClinicalState {
  const labs = new Map<string, any>();
  const meds = new Map<string, any>();
  const conditions = new Map<string, any>();
  const vitals: ClinicalState["vitals"] = {};

  for (const row of Array.isArray(obsRows) ? obsRows : []) {
    const kind = String(row?.kind || "").toLowerCase();
    const meta = (row?.meta as Record<string, any>) || {};
    const cat = String(meta?.category || "").toLowerCase();
    const labelRaw =
      meta?.label ??
      meta?.name ??
      meta?.analyte ??
      meta?.test_name ??
      row?.kind ??
      "Observation";
    const label = String(labelRaw).trim();
    const observedAt = normalizeIso(row?.observed_at ?? meta?.observed_at ?? row?.created_at ?? null);
    const search = `${kind} ${label} ${meta?.summary ?? meta?.notes ?? ""}`.toLowerCase();

    const isLab =
      cat === "lab" ||
      kind.startsWith("lab") ||
      LAB_HINTS.some((hint) => kind.includes(hint) || search.includes(hint));
    const isMedication =
      cat === "medication" ||
      cat === "prescription" ||
      MED_HINTS.some((hint) => kind.includes(hint) || search.includes(hint));
    const isCondition =
      cat === "diagnosis" ||
      cat === "condition" ||
      cat === "problem" ||
      CONDITION_HINTS.some((hint) => kind.includes(hint) || search.includes(hint));
    const isVital =
      cat === "vital" || VITAL_HINTS.some((hint) => kind.includes(hint));

    if (isLab) {
      const numeric =
        row?.value_num != null
          ? parseNumber(row.value_num)
          : parseNumber((row as any)?.value ?? meta?.value ?? meta?.result);
      const textVal =
        row?.value_text ??
        meta?.value ??
        meta?.result ??
        (numeric == null ? null : undefined);
      const entry = {
        name: label,
        value: numeric ?? (textVal != null ? textVal : null),
        unit: row?.unit ?? meta?.unit ?? null,
        takenAt: observedAt,
        panel: meta?.panel ?? null,
        abnormal: meta?.abnormal ?? null,
      };
      const key = `${label.toLowerCase()}|${entry.unit ?? ""}`;
      const prev = labs.get(key);
      if (!prev || new Date(observedAt).getTime() > new Date(prev.takenAt).getTime()) {
        labs.set(key, entry);
      }
    }

    if (isMedication) {
      const dose =
        meta?.dose ??
        meta?.dosage ??
        meta?.sig ??
        (typeof row?.value_text === "string" ? row.value_text : null);
      const entry = {
        name: label,
        dose: dose ? String(dose) : null,
        since: normalizeIso(meta?.started_at ?? meta?.start_date ?? observedAt),
        stoppedAt: meta?.stopped_at || meta?.stop_date ? normalizeIso(meta?.stopped_at ?? meta?.stop_date) : null,
      };
      const key = label.toLowerCase();
      const prev = meds.get(key);
      if (!prev || new Date(entry.since || 0).getTime() > new Date(prev.since || 0).getTime()) {
        meds.set(key, entry);
      }
    }

    if (isCondition) {
      const entry = {
        label,
        status: meta?.status ?? (meta?.active === false ? "resolved" : "active"),
        code: meta?.code ?? meta?.icd10 ?? meta?.icd ?? null,
        since: normalizeIso(meta?.since ?? meta?.start_date ?? observedAt),
      };
      const key = label.toLowerCase();
      const prev = conditions.get(key);
      if (!prev || new Date(entry.since || 0).getTime() > new Date(prev.since || 0).getTime()) {
        conditions.set(key, entry);
      }
    }

    if (isVital) {
      if (kind.includes("bp") || search.includes("blood pressure")) {
        const sbp = parseNumber(meta?.sbp ?? (Array.isArray(meta?.values) ? meta.values?.[0] : null));
        if (sbp != null) vitals.sbp = sbp;
        else if (typeof row?.value_text === "string" && row.value_text.includes("/")) {
          const parts = row.value_text.split(/[\/\s]+/).filter(Boolean);
          const parsed = parseNumber(parts?.[0]);
          if (parsed != null) vitals.sbp = parsed;
        }
      }
      if (kind.includes("hr") || kind.includes("heart") || search.includes("heart rate")) {
        const hr =
          row?.value_num != null
            ? parseNumber(row.value_num)
            : parseNumber(meta?.value ?? row?.value_text);
        if (hr != null) vitals.hr = hr;
      }
      if (kind.includes("spo2") || search.includes("spo2") || search.includes("oxygen")) {
        const spo2 =
          row?.value_num != null
            ? parseNumber(row.value_num)
            : parseNumber(meta?.value ?? row?.value_text);
        if (spo2 != null) vitals.spo2 = spo2;
      }
      if (kind.includes("temp") || search.includes("temperature")) {
        const temp =
          row?.value_num != null
            ? parseNumber(row.value_num)
            : parseNumber(meta?.value ?? row?.value_text);
        if (temp != null) vitals.temp = temp;
      }
    }
  }

  for (const pred of Array.isArray(predRows) ? predRows : []) {
    const details = (pred?.details as Record<string, any>) || {};
    const label =
      pred?.label ??
      pred?.name ??
      details?.label ??
      details?.name ??
      null;
    if (!label) continue;
    const cat = String(details?.category ?? pred?.type ?? "").toLowerCase();
    if (
      cat &&
      !["diagnosis", "condition", "problem"].some((k) => cat.includes(k))
    ) {
      continue;
    }
    const probability =
      typeof pred?.probability === "number"
        ? pred.probability
        : typeof details?.probability === "number"
        ? details.probability
        : null;
    if (probability != null && probability < 0.5) continue;
    const entry = {
      label: String(label),
      status: details?.status ?? (probability != null && probability < 0.7 ? "review" : "active"),
      code: details?.code ?? details?.icd10 ?? details?.icd ?? null,
      since: normalizeIso(details?.since ?? details?.start_date ?? pred?.created_at ?? null),
    };
    const key = entry.label.toLowerCase();
    const prev = conditions.get(key);
    if (!prev || new Date(entry.since || 0).getTime() > new Date(prev.since || 0).getTime()) {
      conditions.set(key, entry);
    }
  }

  return {
    labs: Array.from(labs.values()).sort(
      (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
    ),
    meds: Array.from(meds.values()).sort(
      (a, b) => new Date(b.since || 0).getTime() - new Date(a.since || 0).getTime()
    ),
    conditions: Array.from(conditions.values()).sort(
      (a, b) => new Date(b.since || 0).getTime() - new Date(a.since || 0).getTime()
    ),
    vitals,
  };
}

function safeSummary(text: string, max = 120) {
  const t = text.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

function pushObservationRow(
  collection: any[],
  userId: string,
  threadId: string | null,
  row: {
    kind: string;
    value_num?: number | null;
    value_text?: string | null;
    unit?: string | null;
    observed_at?: string | null;
    meta?: Record<string, any>;
  }
) {
  collection.push({
    user_id: userId,
    thread_id: threadId,
    kind: row.kind,
    value_num: row.value_num ?? null,
    value_text: row.value_text ?? null,
    unit: row.unit ?? null,
    observed_at: normalizeIso(row.observed_at),
    meta: { source_type: "ai_doc", ...(row.meta ?? {}) },
  });
}

function mergeProfileConditions(
  clinical: ClinicalState,
  chronic: string[],
  predisposition: string[]
) {
  const map = new Map<string, any>();
  for (const c of clinical.conditions) {
    if (!c?.label) continue;
    map.set(String(c.label).toLowerCase(), c);
  }

  for (const label of chronic) {
    const trimmed = label.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    const existing = map.get(key);
    const entry = {
      label: trimmed,
      status: "active",
      code: existing?.code ?? null,
      since: existing?.since ?? null,
      source: existing?.source ?? "profile",
    };
    map.set(key, { ...existing, ...entry });
  }

  for (const label of predisposition) {
    const trimmed = label.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (map.has(key)) {
      const existing = map.get(key);
      map.set(key, { ...existing, source: existing?.source ?? "profile" });
      continue;
    }
    map.set(key, {
      label: trimmed,
      status: "history",
      code: null,
      since: null,
      source: "profile",
    });
  }

  clinical.conditions = Array.from(map.values()).sort(
    (a, b) => new Date(b.since || 0).getTime() - new Date(a.since || 0).getTime()
  );
}

function latestObservationByKind(obsRows: any[], kind: string) {
  let latest: any = null;
  let latestTs = -Infinity;
  for (const row of Array.isArray(obsRows) ? obsRows : []) {
    if (!row || row.kind !== kind) continue;
    const ts = new Date(row.observed_at ?? row.created_at ?? 0).getTime();
    if (ts > latestTs) {
      latest = row;
      latestTs = ts;
    }
  }
  return latest;
}

function hydrateProfileDemographics(
  profileRow: any,
  obsRows: any[],
  mem: Awaited<ReturnType<typeof getMemByThread>>
) {
  if (!profileRow) return;

  const ageFromMem = mem.facts.find((f) => f.key === "demographics.age_years");
  if (profileRow.age == null && ageFromMem?.value != null) {
    const parsed = clampAgeYears(ageFromMem.value);
    if (parsed != null) profileRow.age = parsed;
  }

  const pregFromMem = mem.facts.find(
    (f) => f.key === "demographics.pregnancy_status"
  );
  if (profileRow.pregnant == null && pregFromMem?.value != null) {
    const norm = normalizePregnancy(pregFromMem.value);
    if (norm) profileRow.pregnant = norm;
  }

  const ageObs = latestObservationByKind(obsRows, "demographics.age_years");
  if (profileRow.age == null && ageObs) {
    const val =
      ageObs.value_num ??
      clampAgeYears(ageObs.value_text) ??
      clampAgeYears(ageObs.meta?.value);
    if (val != null) profileRow.age = val;
  }

  const pregObs = latestObservationByKind(
    obsRows,
    "demographics.pregnancy_status"
  );
  if (profileRow.pregnant == null && pregObs) {
    const val =
      normalizePregnancy(pregObs.value_text) ??
      normalizePregnancy(pregObs.meta?.value);
    if (val) profileRow.pregnant = val;
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = await req.json().catch(() => ({} as any));
  const rawMessage = payload?.message;
  const message = typeof rawMessage === "string" ? rawMessage : String(rawMessage ?? "");
  if (!message.trim()) return NextResponse.json({ error: "no message" }, { status: 400 });

  const threadId =
    typeof payload?.threadId === "string" && payload.threadId.trim()
      ? payload.threadId.trim()
      : null;
  const profileIntent = payload?.profileIntent;
  const newProfile = payload?.newProfile ?? null;

  const supa = supabaseAdmin();
  let profileRow: any = null;

  if (profileIntent === "new") {
    const patch: Record<string, any> = {
      id: userId,
      full_name: (newProfile?.name || "New Patient").toString().slice(0, 80),
    };
    if (newProfile?.sex) patch.sex = newProfile.sex;

    const { data: upserted, error: upsertErr } = await supa
      .from("profiles")
      .upsert(patch, { onConflict: "id" })
      .select("*")
      .single();
    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }
    profileRow = upserted;

    const seeds: any[] = [];
    const ageYears = clampAgeYears(newProfile?.age);
    if (ageYears != null) {
      profileRow.age = ageYears;
      await upsertMem(userId, null, "aidoc.fact", "demographics.age_years", ageYears);
      pushObservationRow(seeds, userId, threadId, {
        kind: "demographics.age_years",
        value_num: ageYears,
        observed_at: new Date().toISOString(),
        meta: {
          category: "demographic",
          summary: `Age ${ageYears}`,
          value: ageYears,
        },
      });
    }
    const pregStatus = normalizePregnancy(newProfile?.pregnant);
    if (pregStatus) {
      profileRow.pregnant = pregStatus;
      await upsertMem(
        userId,
        null,
        "aidoc.fact",
        "demographics.pregnancy_status",
        pregStatus
      );
      pushObservationRow(seeds, userId, threadId, {
        kind: "demographics.pregnancy_status",
        value_text: pregStatus,
        observed_at: new Date().toISOString(),
        meta: {
          category: "demographic",
          summary: `Pregnancy: ${pregStatus}`,
          value: pregStatus,
        },
      });
    }
    if (newProfile?.symptoms) {
      const text = String(newProfile.symptoms);
      pushObservationRow(seeds, userId, threadId, {
        kind: "note.intake_symptoms",
        value_text: `Symptoms: ${text}`,
        meta: { category: "note", summary: safeSummary(`Symptoms: ${text}`) },
      });
    }
    if (newProfile?.allergies) {
      const text = String(newProfile.allergies);
      pushObservationRow(seeds, userId, threadId, {
        kind: "note.intake_allergies",
        value_text: `Allergies: ${text}`,
        meta: { category: "note", summary: safeSummary(`Allergies: ${text}`) },
      });
    }
    if (newProfile?.meds) {
      const meds = String(newProfile.meds)
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const med of meds) {
        pushObservationRow(seeds, userId, threadId, {
          kind: `medication.intake_${slugify(med)}`,
          value_text: med,
          meta: { category: "medication", summary: med },
        });
      }
    }
    if (seeds.length) {
      const { error: seedErr } = await supa.from("observations").insert(seeds);
      if (seedErr) {
        return NextResponse.json({ error: seedErr.message }, { status: 500 });
      }
    }
  }

  if (!profileRow) {
    const { data, error } = await supa
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    profileRow = data ?? null;
  }
  if (!profileRow) {
    const { data, error } = await supa
      .from("profiles")
      .upsert({ id: userId, full_name: "New Patient" }, { onConflict: "id" })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    profileRow = data;
  }

  if (profileRow) {
    profileRow.chronic_conditions = asStringArray(profileRow.chronic_conditions);
    profileRow.conditions_predisposition = asStringArray(
      profileRow.conditions_predisposition
    );
  }

  let memBefore: Awaited<ReturnType<typeof getMemByThread>>;
  try {
    memBefore = await getMemByThread(userId, threadId);
  } catch (err: any) {
    console.error("[ai-doc] memory preload error", err?.message || err);
    memBefore = { prefs: [], facts: [], redflags: [], goals: [] };
  }

  const obsRes = await supa
    .from("observations")
    .select("id, kind, value_num, value_text, unit, observed_at, created_at, meta")
    .eq("user_id", userId);
  if (obsRes.error) return NextResponse.json({ error: obsRes.error.message }, { status: 500 });

  const predRes = await supa
    .from("predictions")
    .select("id, name, label, type, probability, created_at, details")
    .eq("user_id", userId);
  if (predRes.error) {
    console.warn("[ai-doc] predictions load error", predRes.error.message);
  }

  const obsRows = Array.isArray(obsRes.data) ? obsRes.data : [];
  const predRows = Array.isArray(predRes.data) ? predRes.data : [];
  if (profileRow) {
    hydrateProfileDemographics(profileRow, obsRows, memBefore);
  }
  const clinical = buildClinicalState(obsRows, predRows);
  if (profileRow) {
    mergeProfileConditions(
      clinical,
      profileRow.chronic_conditions ?? [],
      profileRow.conditions_predisposition ?? []
    );
  }
  const profile = buildPromptProfile(profileRow, newProfile);

  const pendingObservations: any[] = [];
  for (const pref of extractPrefsFromUser(message)) {
    const val = pref?.value ?? "";
    await upsertMem(userId, threadId, "aidoc.pref", pref.key, val);
    pushObservationRow(pendingObservations, userId, threadId, {
      kind: `preference.${slugify(pref.key)}`,
      value_text: `Saved preference: ${pref.key} = ${val}`,
      meta: { category: "note", summary: safeSummary(`Saved preference: ${pref.key} = ${val}`), raw: pref },
    });
  }

  // System prompt with guardrails
  let system = buildAiDocPrompt({ profile, labs: clinical.labs, meds: clinical.meds, conditions: clinical.conditions });

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
      conversationId: threadId ?? undefined,
      lastMessageId: null,
      feedback_summary,
      app: "medx",
      mode: "ai-doc",
    },
  });

  const save = out?.save || {};

  for (const p of save.prefs ?? []) {
    const val = p?.value ?? "";
    await upsertMem(userId, threadId, "aidoc.pref", p.key, val);
    pushObservationRow(pendingObservations, userId, threadId, {
      kind: `preference.${slugify(p.key)}`,
      value_text: `Saved preference: ${p.key} = ${val}`,
      meta: { category: "note", summary: safeSummary(`Saved preference: ${p.key} = ${val}`), raw: p },
    });
  }

  for (const c of save.conditions ?? []) {
    if (!c?.label) continue;
    const label = String(c.label).trim();
    if (!label) continue;
    const status = typeof c.status === "string" ? c.status : "active";
    const since = normalizeIso(c.since ?? null);
    clinical.conditions.push({ label, status, code: c.code ?? null, since });
    pushObservationRow(pendingObservations, userId, threadId, {
      kind: `condition.${slugify(label)}`,
      value_text: label,
      observed_at: since,
      meta: { category: "diagnosis", status, code: c.code ?? null, summary: label, raw: c },
    });
  }

  for (const m of save.medications ?? []) {
    if (!m?.name) continue;
    const name = String(m.name).trim();
    if (!name) continue;
    const dose = m.dose ? String(m.dose) : null;
    const since = normalizeIso(m.since ?? null);
    const stoppedAt = m.stoppedAt ? normalizeIso(m.stoppedAt) : null;
    clinical.meds.push({ name, dose, since, stoppedAt });
    pushObservationRow(pendingObservations, userId, threadId, {
      kind: `medication.${slugify(name)}`,
      value_text: dose ? `${name} ${dose}` : name,
      observed_at: since,
      meta: {
        category: "medication",
        name,
        dose,
        since,
        stopped_at: stoppedAt,
        summary: dose ? `${name} ${dose}` : name,
        raw: m,
      },
    });
  }

  for (const l of save.labs ?? []) {
    if (!l?.name) continue;
    const name = String(l.name).trim();
    if (!name) continue;
    const valueNum = parseNumber((l as any).value ?? (l as any).value_num ?? null);
    const rawValue =
      valueNum == null
        ? ((l as any).value_text ?? l.value ?? null)
        : null;
    const valueText = rawValue != null ? String(rawValue) : null;
    const takenAt = normalizeIso(l.takenAt ?? null);
    clinical.labs.push({
      name,
      value: valueNum ?? valueText,
      unit: l.unit ?? null,
      takenAt,
      panel: l.panel ?? null,
      abnormal: (l as any).abnormal ?? null,
    });
    pushObservationRow(pendingObservations, userId, threadId, {
      kind: `lab.${slugify(name)}`,
      value_num: valueNum,
      value_text: valueNum == null ? valueText : null,
      unit: l.unit ?? null,
      observed_at: takenAt,
      meta: {
        category: "lab",
        label: name,
        panel: l.panel ?? null,
        abnormal: (l as any).abnormal ?? null,
        summary: safeSummary(`${name}: ${valueText ?? valueNum ?? ""}${l.unit ? ` ${l.unit}` : ""}`),
        raw: l,
      },
    });
  }

  for (const note of save.notes ?? []) {
    if (!note) continue;
    const text = String(note).trim();
    if (!text) continue;
    pushObservationRow(pendingObservations, userId, threadId, {
      kind: "note.ai_doc",
      value_text: text,
      meta: { category: "note", summary: safeSummary(text) },
    });
  }

  let memAfter;
  try {
    memAfter = await getMemByThread(userId, threadId);
  } catch (err: any) {
    console.error("[ai-doc] memory load error", err?.message || err);
    memAfter = { prefs: [], facts: [], redflags: [], goals: [] };
  }

  const ruled = runRules({ labs: clinical.labs, meds: clinical.meds, conditions: clinical.conditions, mem: memAfter });
  const plan = buildPersonalPlan(ruled, memAfter, { vitals: clinical.vitals, symptomsText: message });

  // Keep core alerts fresh (stale/abnormal)
  await fetch(new URL("/api/alerts/recompute", req.url), {
    method: "POST",
    headers: { cookie: req.headers.get("cookie") || "" },
  }).catch(() => {});

  pushObservationRow(pendingObservations, userId, threadId, {
    kind: "ai_doc.rules_fired",
    value_text: `Rules: ${plan.rulesFired.join(", ")}`,
    meta: {
      category: "note",
      summary: `Rules: ${plan.rulesFired.join(", ")}`,
      details: { rules: plan.rulesFired },
    },
  });

  if (pendingObservations.length) {
    const { error: insertErr } = await supa.from("observations").insert(pendingObservations);
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
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
