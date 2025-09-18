import { NextRequest, NextResponse } from 'next/server';
// [AIDOC_TRIAGE_IMPORT] add triage imports
import { handleDocAITriage, detectExperientialIntent } from "@/lib/aidoc/triage";
import { getUserId } from "@/lib/getUserId";
import { loadPatientSnapshot, type PatientSnapshot } from "@/lib/patient/snapshot";
import {
  extractObservationInputs,
  formatPatientContext,
  mergeClinicalInputs,
} from "@/lib/aidoc/context";
import { extractAll } from "@/lib/medical/engine/extract";
import { computeAll, renderResultsBlock } from "@/lib/medical/engine/computeAll";
import { POST as streamPOST, runtime } from "../../chat/stream/route";

export { runtime };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const message = (body?.message ?? body?.text ?? "").toString();
  const answers = (body?.answers && typeof body.answers === "object") ? body.answers : null;
  const incomingProfile = (body?.profile && typeof body.profile === "object") ? body.profile : null;

  const mode = typeof body?.mode === "string" ? body.mode : null;
  const userId = await getUserId(req);
  const shouldLoadSnapshot = mode === "doctor" || process.env.FEATURE_TRIAGE_V2 === "1";
  let supaSnapshot: PatientSnapshot | null = null;
  if (shouldLoadSnapshot && userId) {
    try {
      supaSnapshot = await loadPatientSnapshot(userId);
    } catch (err) {
      console.error("[AidocChat] failed to load patient snapshot", err);
      supaSnapshot = null;
    }
  }

  const profile = {
    name: supaSnapshot?.profile?.name ?? null,
    age: supaSnapshot?.profile?.age ?? null,
    sex: supaSnapshot?.profile?.sex ?? null,
    pregnant: null as boolean | null,
  };

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

  const baseMessages: Array<{ role: string; content: string }> = Array.isArray(body?.messages)
    ? body.messages.filter((m: any) => m && typeof m.content === "string")
    : [];

  const patchedBody: Record<string, any> = { ...body, messages: [...baseMessages] };

  if (mode === "doctor") {
    if (!supaSnapshot && userId) {
      try {
        supaSnapshot = await loadPatientSnapshot(userId);
      } catch (err) {
        console.error("[AidocChat] failed to load patient snapshot", err);
        supaSnapshot = null;
      }
    }

    type MinimalMessage = { role: "system" | "user" | "assistant"; content: string };
    const contextMessages: MinimalMessage[] = [];

    if (supaSnapshot) {
      const patientContext = formatPatientContext({
        snapshot: supaSnapshot,
        rawObservations: supaSnapshot.rawObservations,
      });

      const observationInputs = extractObservationInputs(supaSnapshot.rawObservations);
      if (supaSnapshot.profile.age != null && observationInputs.age == null) {
        observationInputs.age = supaSnapshot.profile.age;
      }

      const latestUserMessage =
        [...baseMessages]
          .reverse()
          .find((m) => m?.role === "user" && typeof m?.content === "string")?.content ??
        message;

      const messageInputs = extractAll(latestUserMessage || "");
      const mergedInputs = mergeClinicalInputs(observationInputs, messageInputs);
      const computed = computeAll({ ...mergedInputs });
      const derivedBlock = renderResultsBlock(computed);

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

      const ag = byId["anion_gap"];
      const agc = byId["anion_gap_corrected"];
      const dr = byId["delta_ratio_ag"];
      if (ag) {
        let line = `HAGMA: AG ${ag.value}`;
        if (agc) line += ` (corr ${agc.value})`;
        if (dr?.notes?.length) line += `; ${dr.notes.join("; ")}`;
        lines.push(line);
      }

      const HCO3 = (mergedInputs as any).HCO3;
      const winter = byId["winters_expected_paco2"];
      const pco2 = (mergedInputs as any).pCO2 ?? (mergedInputs as any).PaCO2 ?? null;
      if (HCO3 != null && winter) {
        let line = `Acidemia driver: HCO₃ ${HCO3}`;
        line += `; Winter’s exp pCO₂ ${winter.value} (±2)`;
        if (pco2 != null) line += ` vs actual ${Math.round(pco2 * 10) / 10}`;
        lines.push(line);
      }

      const glucose = (mergedInputs as any).glucose_mgdl;
      const sodium = byId["sodium_status"];
      if (glucose != null && sodium) {
        const trans = sodium.notes?.find((n: string) => n.toLowerCase().includes("translocational"));
        let line = `Glucose ${glucose}; Corrected Na ${sodium.value}`;
        if (trans) line += ` — ${trans}`;
        lines.push(line);
      }

      const kGuard = byId["ada_k_guard"];
      if (kGuard) {
        const note = kGuard.notes?.[0] ?? "";
        lines.push(`K ${kGuard.value} — ${note}`);
      }

      const lactate = byId["lactate_status"];
      if (lactate) {
        const note = lactate.notes?.[0] ?? "";
        lines.push(`Lactate ${lactate.value} — ${note}`);
      }

      const osmCalc = byId["serum_osmolality"];
      const measuredOsm =
        (mergedInputs as any).Osm_measured ??
        (mergedInputs as any).measured_osm ??
        (mergedInputs as any).osm_meas ??
        null;
      const osmGap = byId["osmolal_gap"];
      if (osmCalc || measuredOsm != null || osmGap) {
        let line = "Osm:";
        if (osmCalc) line += ` calc ${osmCalc.value}`;
        if (measuredOsm != null) line += ` / measured ${measuredOsm}`;
        if (osmGap) line += `; gap ${osmGap.value}`;
        lines.push(line);
      }

      const dka = byId["dka_flag"];
      const hhs = byId["hhs_flag"];
      if (dka || hhs) {
        const toNum = (r: any) => (r?.value === "yes" ? 1 : 0);
        lines.push(`Gate(s): DKA ${toNum(dka)}; HHS ${toNum(hhs)}`);
      }

      const curatedLines = lines.join("\n");
      if (curatedLines) {
        contextMessages.push({
          role: "system",
          content: [
            "Use only the pre-computed clinical values below when directly relevant. Do not list other scores unless asked.",
            curatedLines,
          ]
            .filter(Boolean)
            .join("\n"),
        });
      }

      const instructions = [
        "Patient chart context is provided below. Integrate relevant details directly into your answer.",
        "When you cite labs, vitals, or other observations, quote the exact value with units and observation date.",
        "If you reference derived calculations (e.g., corrected sodium, Winter’s expected pCO₂, osmolal gap), mention which inputs were used.",
        patientContext,
        derivedBlock,
      ]
        .filter(Boolean)
        .join("\n\n");

      if (instructions) {
        contextMessages.push({ role: "system", content: instructions });
      }
    } else {
      contextMessages.push({
        role: "system",
        content:
          "No structured patient profile or observations were found. Ask the user for the key history, medications, vitals, and labs before final recommendations.",
      });
    }

    patchedBody.messages = [...contextMessages, ...patchedBody.messages];
  }

  const headers = new Headers(req.headers);
  headers.set("content-type", "application/json");
  const forwarded = new Request(req.url, {
    method: req.method,
    headers,
    body: JSON.stringify(patchedBody),
  });

  return streamPOST(forwarded as any);
}
