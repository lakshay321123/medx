import { NextRequest, NextResponse } from 'next/server';
// [AIDOC_TRIAGE_IMPORT] add triage imports
import { handleDocAITriage, detectExperientialIntent } from "@/lib/aidoc/triage";
import { POST as streamPOST, runtime } from "../../chat/stream/route";
import { getUserId } from "@/lib/getUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";

export { runtime };

export async function POST(req: NextRequest) {
  const cloned = req.clone();
  const body = await req.json().catch(() => ({} as any));
  const message = (body?.message ?? body?.text ?? "").toString();
  const answers = (body?.answers && typeof body.answers === "object") ? body.answers : null;
  const incomingProfile = (body?.profile && typeof body.profile === "object") ? body.profile : null;
  const mode = typeof body?.mode === "string" ? body.mode : undefined;
  let systemPrompt = typeof body?.systemPrompt === "string" ? body.systemPrompt : "";

  // ensure you have resolved the `profile` object here
  // profile = { name, age, sex, pregnant }
  const profile: any = undefined;

  const demoFromAnswers = (answers && typeof (answers as any).demographics === "object") ? (answers as any).demographics : null;
  const triageProfile = {
    name: (incomingProfile as any)?.name ?? profile?.name,
    age: (incomingProfile as any)?.age ?? profile?.age,
    sex: (incomingProfile as any)?.sex ?? profile?.sex,
    pregnant: (incomingProfile as any)?.pregnant ?? profile?.pregnant,
    ...(demoFromAnswers ?? {}),
  };

  // [AIDOC_TRIAGE_GUARD] intercept before streaming
  if (process.env.FEATURE_TRIAGE_V2 === "1" && message && detectExperientialIntent(message)) {
    try {
      const triage = await handleDocAITriage({
        text: message,
        profile: triageProfile,
        answers: (answers && typeof (answers as any).intake === "object") ? (answers as any).intake : answers,
      });

      if (triage.stage === "demographics") {
        return NextResponse.json({
          role: "assistant",
          stage: "demographics",
          prompt: "Hey—let’s get a couple basics first:",
          questions: triage.questions,
        });
      }
      if (triage.stage === "intake") {
        return NextResponse.json({
          role: "assistant",
          stage: "intake",
          prompt: "Hey, hang in there—I need a few quick details:",
          questions: triage.questions,
        });
      }
      return NextResponse.json({
        role: "assistant",
        stage: "advice",
        message: triage.message,
        soap: triage.soap,
      });
    } catch {
      // fall through to legacy stream
    }
  }

  let forward: NextRequest | Request = cloned;

  if (mode === "aidoc") {
    const userId = await getUserId(req);
    if (userId) {
      try {
        const admin = supabaseAdmin();
        const [profile, observations, timeline] = await Promise.all([
          getPatientProfile(userId, admin),
          getObservations(userId, admin),
          getTimeline(userId, admin),
        ]);

        const timelineSummary = (timeline ?? [])
          .map((t: any) => (typeof t?.text === "string" ? t.text : ""))
          .filter(Boolean)
          .join("\n\n");

        const medicalContext = [
          "PATIENT PROFILE:",
          JSON.stringify(profile ?? {}, null, 2),
          "OBSERVATIONS:",
          JSON.stringify(observations ?? [], null, 2),
          "TIMELINE SUMMARY:",
          timelineSummary || "(no timeline events)",
        ].join("\n\n");

        if (medicalContext.trim()) {
          systemPrompt = systemPrompt
            ? `${systemPrompt}\n\n---\n\n${medicalContext}`
            : medicalContext;
          body.systemPrompt = systemPrompt;

          const headers = new Headers(req.headers);
          headers.set("content-type", "application/json");
          headers.delete("content-length");

          forward = new NextRequest(req.url, {
            method: req.method,
            headers,
            body: JSON.stringify(body),
          });
        }
      } catch (err) {
        console.warn("[aidoc] failed to build medical context", err);
      }
    }
  }

  // existing streaming setup continues here
  return streamPOST(forward as any);
}

type AdminClient = ReturnType<typeof supabaseAdmin>;

async function getPatientProfile(userId: string, db?: AdminClient) {
  try {
    const supa = db ?? supabaseAdmin();
    const { data, error } = await supa
      .from("profiles")
      .select(
        "id, full_name, dob, sex, blood_group, chronic_conditions, conditions_predisposition"
      )
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) {
      if (error) console.warn("[aidoc] profile fetch error", error.message || error);
      return null;
    }
    const chronic = normalizeStringArray((data as any).chronic_conditions);
    const predis = normalizeStringArray((data as any).conditions_predisposition);
    const dob = data.dob ? new Date(data.dob) : null;
    const age = dob && !Number.isNaN(+dob)
      ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 864e5))
      : null;
    return {
      id: data.id,
      name: data.full_name ?? null,
      dob: data.dob ?? null,
      age,
      sex: data.sex ?? null,
      bloodGroup: (data as any).blood_group ?? null,
      chronicConditions: chronic,
      predispositions: predis,
    };
  } catch (err) {
    console.warn("[aidoc] profile fetch failed", err);
    return null;
  }
}

async function getObservations(userId: string, db?: AdminClient) {
  try {
    const supa = db ?? supabaseAdmin();
    const { data, error } = await supa
      .from("observations")
      .select("*")
      .eq("user_id", userId)
      .limit(40);
    if (error) {
      console.warn("[aidoc] observations fetch error", error.message || error);
      return [];
    }
    return Array.isArray(data) ? data.map(normalizeObservation) : [];
  } catch (err) {
    console.warn("[aidoc] observations fetch failed", err);
    return [];
  }
}

type TimelineEntry = { text: string; observed_at: string; kind: "prediction" | "observation" };

async function getTimeline(userId: string, db?: AdminClient): Promise<TimelineEntry[]> {
  try {
    const supa = db ?? supabaseAdmin();
    const [predRes, obsRes] = await Promise.all([
      supa.from("predictions").select("*").eq("user_id", userId),
      supa.from("observations").select("*").eq("user_id", userId),
    ]);

    if (predRes.error) {
      console.warn("[aidoc] timeline predictions error", predRes.error.message || predRes.error);
    }
    if (obsRes.error) {
      console.warn("[aidoc] timeline observations error", obsRes.error.message || obsRes.error);
    }

    const preds = Array.isArray(predRes.data) ? predRes.data : [];
    const obs = Array.isArray(obsRes.data) ? obsRes.data : [];

    const items: TimelineEntry[] = [];

    for (const row of preds) {
      const meta = (row as any)?.details ?? (row as any)?.meta ?? {};
      const name =
        (row as any)?.name ??
        meta?.label ??
        meta?.name ??
        meta?.task ??
        "Prediction";
      const probability =
        typeof (row as any)?.probability === "number"
          ? (row as any).probability
          : typeof meta?.probability === "number"
          ? meta.probability
          : null;
      const pct = probability != null ? Math.round(probability * 100) : null;
      const summary = meta?.summary ?? meta?.summary_long ?? meta?.text ?? "";
      const parts = [
        `Prediction — ${name}`,
        pct != null ? `Probability: ${pct}%` : "",
        summary ? summary : "",
        `Recorded: ${iso((row as any)?.created_at)}`,
      ].filter(Boolean);
      items.push({
        kind: "prediction",
        observed_at: pickObserved(row),
        text: parts.join("\n"),
      });
    }

    for (const row of obs) {
      const normalized = normalizeObservation(row);
      const valueStr =
        normalized.value == null
          ? null
          : typeof normalized.value === "number"
          ? normalized.value
          : String(normalized.value);
      const obsParts = [
        `Observation — ${normalized.name}`,
        valueStr != null ? `Value: ${valueStr}${normalized.unit ? ` ${normalized.unit}` : ""}` : "",
        normalized.summary ? normalized.summary : "",
        `Observed: ${normalized.observedAt}`,
      ].filter(Boolean);
      items.push({
        kind: "observation",
        observed_at: normalized.observedAt,
        text: obsParts.join("\n"),
      });
    }

    return items
      .sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime())
      .slice(0, 25);
  } catch (err) {
    console.warn("[aidoc] timeline fetch failed", err);
    return [];
  }
}

function normalizeObservation(row: any) {
  const meta = row?.meta ?? row?.details ?? {};
  const name =
    row?.name ??
    row?.metric ??
    row?.test ??
    meta?.analyte ??
    meta?.test_name ??
    meta?.label ??
    "Observation";
  const value =
    row?.value ??
    row?.value_num ??
    meta?.value ??
    meta?.value_num ??
    meta?.result ??
    null;
  const unit = row?.unit ?? meta?.unit ?? null;
  const summary = meta?.summary ?? meta?.summary_long ?? meta?.text ?? null;
  const flags = Array.isArray(row?.flags)
    ? row.flags
    : Array.isArray(meta?.flags)
    ? meta.flags
    : null;

  return {
    id: String(row?.id ?? ""),
    kind: row?.kind ?? "observation",
    name,
    value,
    unit,
    summary,
    flags,
    observedAt: pickObserved(row),
    meta,
  };
}

function normalizeStringArray(value: any): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v));
    } catch {
      return value
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function iso(ts: any) {
  const d = new Date(ts || Date.now());
  return Number.isNaN(+d) ? new Date().toISOString() : d.toISOString();
}

function pickObserved(r: any) {
  return iso(
    r?.observed_at ??
      r?.report_date ??
      r?.details?.report_date ??
      r?.meta?.report_date ??
      r?.meta?.observed_at ??
      r?.details?.observed_at ??
      r?.recorded_at ??
      r?.measured_at ??
      r?.taken_at ??
      r?.timestamp ??
      r?.created_at ??
      r?.createdAt
  );
}
