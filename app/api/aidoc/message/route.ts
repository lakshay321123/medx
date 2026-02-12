import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// [AIDOC_TRIAGE_IMPORT] add triage imports
import { handleDocAITriage, detectExperientialIntent } from "@/lib/aidoc/triage";
import { getUserId } from "@/lib/getUserId";
import { wasAskedOnce, markAsked } from "@/lib/aidoc/memory";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({} as any));
  const hasBooted = cookies().get("aidoc_booted")?.value === "1";
  if (payload.op === "boot" && !hasBooted) {
    cookies().set("aidoc_booted", "1", { httpOnly: true, sameSite: "lax" });
    return NextResponse.json({ type: "greeting", text: "Hi, how can I help today?" });
  }

  const message = (payload?.message ?? payload?.text ?? "").toString();
  const op = payload?.op;
  const boot = payload?.boot === true || op === "boot";
  const rawUserId = await getUserId();
  const userId = rawUserId ?? "";
  const threadId = payload.threadId || "aidoc:" + userId;
  // Structured payloads from UI
  const answers = (payload?.answers && typeof payload.answers === "object") ? payload.answers : null;
  const incomingProfile = (payload?.profile && typeof payload.profile === "object") ? payload.profile : null;

  // ensure you have resolved the `profile` object here
  // profile = { name, age, sex, pregnant }
  let profile: any = null;
  let observations: Array<{
    id: string;
    observed_at: string;
    kind: string;
    summary: string | null;
    value_text: string | null;
    meta: unknown;
  }> = [];
  if (rawUserId) {
    try {
      const sb = db();
      const profilePromise = sb
        .from("profiles")
        .select("display_name,dob,sex,meta")
        .eq("id", rawUserId)
        .maybeSingle();
      const observationsPromise = sb
        .from("observations")
        .select("id, observed_at, kind, summary, value_text, meta")
        .eq("user_id", rawUserId)
        .order("observed_at", { ascending: false })
        .limit(50);
      const [{ data: prof }, { data: obs }] = await Promise.all([profilePromise, observationsPromise]);
      const dob = prof?.dob ? new Date(prof.dob) : null;
      const age = dob && !Number.isNaN(dob.getTime())
        ? Math.max(0, Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)))
        : undefined;
      profile = {
        name: prof?.display_name || undefined,
        age,
        sex: prof?.sex || undefined,
      };
      observations = Array.isArray(obs) ? obs : [];
    } catch (err) {
      console.error("Failed to load profile for triage:", err);
      observations = [];
    }
  }

  // Merge demographics from request (or from answers.demographics) into profile for triage
  const demoFromAnswers = (answers && typeof (answers as any).demographics === "object") ? (answers as any).demographics : null;
  const triageProfile = {
    name: (incomingProfile as any)?.name ?? profile?.name,
    age: (incomingProfile as any)?.age ?? profile?.age,
    sex: (incomingProfile as any)?.sex ?? profile?.sex,
    pregnant: (incomingProfile as any)?.pregnant ?? profile?.pregnant,
    observationsSnapshot: observations.slice(0, 25).map((o) => ({
      when: o.observed_at,
      kind: o.kind,
      title: o.summary,
      summary: typeof o.value_text === "string" ? o.value_text.slice(0, 600) : o.meta,
    })),
    ...(demoFromAnswers ?? {}),
  };

  // [AIDOC_TRIAGE_GUARD] run triage first; early-return on success
  if (process.env.FEATURE_TRIAGE_V2 === "1" && message && detectExperientialIntent(message)) {
    try {
      const triage = await handleDocAITriage({
        text: message,
        profile: triageProfile,
        // Prefer answers.intake if UI separates demographics vs intake
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
      // fall through to legacy behavior
    }
  }

  // Only emit canned welcome on explicit boot; never on user greetings
  if (boot === true && !hasBooted) {
    cookies().set("aidoc_booted", "1", { httpOnly: true, sameSite: "lax" });
    return NextResponse.json({
      messages: [
        { role: "assistant", content: "Hi! 👋 How can I help today? You can describe symptoms or upload a report." }
      ]
    });
  }
  if (!boot) {
    const title = payload.title ?? inferTitleFromText(message);
    if (userId) {
      const sb = db();
      await sb.from("chat_threads").upsert(
        {
          id: threadId,
          user_id: userId,
          mode: "aidoc",
          title: title || "AI Doc — New Case",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    }
  }

  const canAskMeds = userId ? !(await wasAskedOnce(userId, threadId, "asked_meds")) : false;
  const inTriageIntake = false;
  if (process.env.AIDOC_ENABLE_MED_PROMPT !== "0" && canAskMeds && !inTriageIntake) {
    await markAsked(userId, threadId, "asked_meds");
    return NextResponse.json({
      messages: [
        { role: "assistant", content: "Quick check: do you take any regular meds? Please share name + dose (e.g., Metformin 500 mg)." }
      ],
    });
  }

  return NextResponse.json({ messages: [] });
}

function inferTitleFromText(t: string) {
  const key = (t || "").toLowerCase();
  const hit = ["fever","cough","chest pain","headache","rash","sore throat","back pain"].find(k => key.includes(k));
  return hit ? `AI Doc — ${hit[0].toUpperCase()}${hit.slice(1)}` : "AI Doc — New Case";
}
