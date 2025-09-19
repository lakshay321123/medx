import { NextRequest, NextResponse } from 'next/server';
// [AIDOC_TRIAGE_IMPORT] add triage imports
import { handleDocAITriage, detectExperientialIntent } from "@/lib/aidoc/triage";
import { POST as streamPOST } from "../../chat/stream/route";
import { getUserId } from "@/lib/getUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const message = (body?.message ?? body?.text ?? "").toString();
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
  let labsTrend: any[] | null = null;
  try {
    const userId = await getUserId(req);
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
        const baseURL = req.nextUrl.origin;
        const res = await fetch(`${baseURL}/api/labs/summary`, {
          headers: {
            cookie: req.headers.get("cookie") ?? "",
          },
          cache: "no-store",
        });
        const body = await res.json().catch(() => null);
        if (body?.ok && Array.isArray(body.trend)) {
          labsTrend = body.trend as any[];
        }
      } catch (labsErr) {
        console.error("Failed to fetch labs summary for AI Doc chat:", labsErr);
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

  if (labsTrend) {
    messages.unshift({
      role: "system",
      content:
        "Use this structured patient context:"
        + "\n<LABS>" + JSON.stringify(labsTrend) + "</LABS>"
        + "\nIf asked about reports or trends, rely on LABS only (do not parse free text).",
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
