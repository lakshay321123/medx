import { NextRequest, NextResponse } from 'next/server';
// [AIDOC_TRIAGE_IMPORT] add triage imports
import { handleDocAITriage, detectExperientialIntent } from "@/lib/aidoc/triage";
import { POST as streamPOST, runtime } from "../../chat/stream/route";

export { runtime };

export async function POST(req: NextRequest) {
  const cloned = req.clone();
  const body = await req.json().catch(() => ({} as any));
  const message = (body?.message ?? body?.text ?? "").toString();
  const answers = (body?.answers && typeof body.answers === "object") ? body.answers : null;

  // [AIDOC_TRIAGE_GUARD] intercept before streaming
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
      // fall through to legacy stream
    }
  }

  // existing streaming setup continues here
  return streamPOST(cloned as any);
}
