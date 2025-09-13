import { NextResponse } from 'next/server';
// [AIDOC_TRIAGE_IMPORT] add triage imports
import { handleDocAITriage, detectExperientialIntent } from "@/lib/aidoc/triage";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const message = (body?.message ?? body?.text ?? "").toString();
  const boot = body?.boot === true;
  // optional structured answers from the UI after intake questions
  const answers = (body?.answers && typeof body.answers === "object") ? body.answers : null;

  // [AIDOC_TRIAGE_GUARD] run triage first; early-return on success
  if (process.env.FEATURE_TRIAGE_V2 === "1" && message && detectExperientialIntent(message)) {
    try {
      const triage = await handleDocAITriage({ text: message, answers });

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
  if (boot === true) {
    return NextResponse.json({
      messages: [
        { role: "assistant", content: "Hi! 👋 How can I help today? You can describe symptoms or upload a report." }
      ]
    });
  }
  // Otherwise: do nothing (caller should use normal chat route)
  return NextResponse.json({ messages: [] });
}
