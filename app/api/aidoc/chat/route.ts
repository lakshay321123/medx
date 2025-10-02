import { NextRequest, NextResponse } from 'next/server';
// [AIDOC_TRIAGE_IMPORT] add triage imports
import { handleDocAITriage, detectExperientialIntent } from "@/lib/aidoc/triage";
import {
  detectLabSnapshotIntent,
  formatLabIntentResponse,
  isLabSnapshotEnabled,
  isLabSnapshotHardMode,
  type LabSnapshotIntent,
} from "@/lib/aidoc/labsSnapshot";
import { normalizeAidocThreadType } from "@/lib/aidoc/threadType";
import { POST as streamPOST } from "../../chat/stream/route";
import { getUserId } from "@/lib/getUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchLabSummary, type LabSummaryResult } from "@/lib/labs/summary";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const message = (body?.message ?? body?.text ?? "").toString();
  const threadTypeHint = body?.threadType;
  const threadId = typeof body?.threadId === "string" ? body.threadId : null;

  const earlyIntercept = await maybeHandleAidocLabIntent({
    req,
    message,
    threadTypeHint,
    threadId,
  });
  if (earlyIntercept) return earlyIntercept;

  const answers = (body?.answers && typeof body.answers === "object") ? body.answers : null;
  const incomingProfile = (body?.profile && typeof body.profile === "object") ? body.profile : null;
  const messages: Array<{ role: string; content: string }> = Array.isArray(body?.messages)
    ? [...body.messages]
    : [];
  const context = typeof body?.context === "string" ? body.context : undefined;
  const needsContextPacket = !!context && ["profile", "timeline", "ai-doc-med-profile"].includes(context);

  // ensure you have resolved the `profile` object here
  // profile = { name, age, sex, pregnant }
  let profile: any = null;
  let contextPacket: any = null;
  let observations: Array<{
    id: string;
    observed_at: string;
    kind: string;
    title: string | null;
    payload: unknown;
  }> = [];
  let labsPacket: LabSummaryResult | null = null;
  let labsError: Error | null = null;
  let userId: string | null = null;
  try {
    userId = await getUserId(req);
    if (userId) {
      const sb = supabaseAdmin();
      const { data: prof } = await sb
        .from("profiles")
        .select("full_name,dob,sex,blood_group,conditions_predisposition,chronic_conditions")
        .eq("id", userId)
        .maybeSingle();
      const obsResponse = needsContextPacket
        ? await sb
            .from("observations")
            .select("id, observed_at, kind, title, payload")
            .eq("user_id", userId)
            .order("observed_at", { ascending: false })
            .limit(50)
        : { data: null };
      try {
        const summary = await fetchLabSummary(sb, { userId, limit: 1000 });
        labsPacket = summary;
      } catch (err) {
        labsError = err instanceof Error ? err : new Error(String(err ?? "lab summary error"));
      }
      const obs = obsResponse.data;
      const dob = prof?.dob ? new Date(prof.dob) : null;
      const age = dob && !Number.isNaN(dob.getTime())
        ? Math.max(0, Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)))
        : undefined;
      profile = {
        name: prof?.full_name || undefined,
        age,
        sex: prof?.sex || undefined,
      };
      observations = Array.isArray(obs) ? obs : [];
      if (needsContextPacket) {
        const briefObs = observations.map((o) => ({
          id: o.id,
          when: o.observed_at,
          kind: o.kind,
          title: o.title,
          summary: typeof o.payload === "string" ? o.payload.slice(0, 800) : o.payload,
        }));
        contextPacket = {
          profile: {
            name: prof?.full_name,
            age,
            sex: prof?.sex,
            blood_group: prof?.blood_group,
            chronic_conditions: prof?.chronic_conditions,
            risk_predisposition: prof?.conditions_predisposition,
          },
          observations: briefObs,
        };
      }
    }
  } catch (err) {
    console.error("Failed to load profile for triage:", err);
    observations = [];
  }

  const labIntent: LabSnapshotIntent | null =
    isLabSnapshotEnabled() && message ? detectLabSnapshotIntent(message) : null;

  if (labIntent) {
    if (!userId) {
      return streamTextResponse("Please sign in to view your lab reports.");
    }

    if (labsError && !labsPacket) {
      const fallbackMessage = formatLabIntentResponse([], labIntent, {
        emptyMessage: "I couldn’t load your lab reports right now. Please try again in a bit.",
      });
      return streamTextResponse(fallbackMessage);
    }

    const trend = labsPacket?.trend ?? [];
    const messageText = formatLabIntentResponse(trend, labIntent);
    return streamTextResponse(messageText);
  }

  if (labsPacket !== null) {
    messages.unshift({
      role: "system",
      content: `If LABS are present, ground your answer in them:
<LABS>${JSON.stringify(labsPacket)}</LABS>
- "check my last blood report" → summarize latest per test_code.
- "pull all my reports & changes" → compare latest vs previous (Improving/Worsening/Flat).
- "see them date wise" → list date→value for each test, newest first.`
    });
  }

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

  // -------- Context Packet: profile + observations --------
  if (!contextPacket && needsContextPacket && profile) {
    const briefObs = observations.map((o) => ({
      id: o.id,
      when: o.observed_at,
      kind: o.kind,
      title: o.title,
      summary: typeof o.payload === "string" ? o.payload.slice(0, 800) : o.payload,
    }));
    contextPacket = {
      profile: {
        name: profile?.name,
        age: profile?.age,
        sex: profile?.sex,
      },
      observations: briefObs,
    };
  }

  const systemPreamble = {
    role: "system",
    content:
      "You are AI Doc. If a context packet is present, USE IT for clinical reasoning before asking for clarifications."
      + (contextPacket ? `\n\n<CONTEXT_PACKET>${JSON.stringify(contextPacket)}</CONTEXT_PACKET>` : ""),
  };
  const finalMessages = [systemPreamble, ...messages];
  const forwardBody = { ...body, messages: finalMessages };

  const headers = new Headers(req.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json");
  const forwardReq = new NextRequest(req.url, {
    method: req.method,
    headers,
    body: JSON.stringify(forwardBody),
  });

  // existing streaming setup continues here
  return streamPOST(forwardReq);
}

async function maybeHandleAidocLabIntent(params: {
  req: NextRequest;
  message: string;
  threadTypeHint: unknown;
  threadId: string | null;
}): Promise<NextResponse | null> {
  if (!isLabSnapshotEnabled()) return null;
  const text = typeof params.message === "string" ? params.message.trim() : "";
  if (!text) return null;

  const intent = detectLabSnapshotIntent(text);
  if (!intent) return null;

  const normalizedThreadType = normalizeAidocThreadType(params.threadTypeHint) ?? "aidoc";
  const allowHard = isLabSnapshotHardMode() && !normalizedThreadType;
  if (normalizedThreadType !== "aidoc" && !allowHard) {
    return null;
  }

  const intentLabel = intent.kind === "snapshot" ? "snapshot" : `compare:${intent.metric.label}`;
  console.log("[aidoc-labs] intercept", {
    flag: process.env.AIDOC_FORCE_INTERCEPT ?? "0",
    hardFlag: process.env.AIDOC_FORCE_INTERCEPT_HARD ?? "0",
    threadType: normalizedThreadType ?? "unknown",
    intent: intentLabel,
    threadId: params.threadId ?? undefined,
  });

  const userId = await getUserId(params.req);
  if (!userId) {
    return streamTextResponse("Please sign in to view your lab reports.");
  }

  try {
    const summary = await fetchLabSummary(supabaseAdmin(), { userId, limit: 1000 });
    const trend = summary?.trend ?? [];
    const message = formatLabIntentResponse(trend, intent);
    return streamTextResponse(message);
  } catch (err) {
    const fallback = formatLabIntentResponse([], intent, {
      emptyMessage: "I couldn’t load your lab reports right now. Please try again in a bit.",
    });
    console.error("[aidoc-labs] intercept labs failure", err);
    return streamTextResponse(fallback);
  }
}

function streamTextResponse(text: string) {
  const payload =
    `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n` +
    "data: [DONE]\n\n";
  return new NextResponse(payload, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
    },
  });
}
