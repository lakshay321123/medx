import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// [AIDOC_TRIAGE_IMPORT] add triage imports
import { handleDocAITriage, detectExperientialIntent } from "@/lib/aidoc/triage";
import { getUserId } from "@/lib/getUserId";
import { prisma } from "@/lib/prisma";
import { wasAskedOnce, markAsked } from "@/lib/aidoc/memory";

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
  const userId = (await getUserId()) ?? "";
  const threadId = payload.threadId || "aidoc:" + userId;
  const text = message.toLowerCase();
  const wantsPrediction =
    /risk|red\s*flags|prediction|prognosis|heart|diabet|cancer/.test(text);

  if (wantsPrediction && payload?.patientId) {
    const base = process.env.NEXTAUTH_URL;
    const url = base ? new URL("/api/predict", base).toString() : "/api/predict";
    const cookieHeader = cookies().toString();
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ patientId: payload.patientId, source: "chat" }),
      cache: "no-store",
    }).catch(() => {});
  }
  // Structured payloads from UI
  const answers = (payload?.answers && typeof payload.answers === "object") ? payload.answers : null;
  const incomingProfile = (payload?.profile && typeof payload.profile === "object") ? payload.profile : null;

  // ensure you have resolved the `profile` object here
  // profile = { name, age, sex, pregnant }
  const profile: any = undefined;

  // Merge demographics from request (or from answers.demographics) into profile for triage
  const demoFromAnswers = (answers && typeof (answers as any).demographics === "object") ? (answers as any).demographics : null;
  const triageProfile = {
    name: (incomingProfile as any)?.name ?? profile?.name,
    age: (incomingProfile as any)?.age ?? profile?.age,
    sex: (incomingProfile as any)?.sex ?? profile?.sex,
    pregnant: (incomingProfile as any)?.pregnant ?? profile?.pregnant,
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
    await prisma.chatThread.upsert({
      where: { id: threadId },
      create: { id: threadId, userId, type: "aidoc", title },
      update: { updatedAt: new Date(), title: title || undefined },
    });
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
