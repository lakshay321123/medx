import { openaiText } from "@/lib/llm";
import { supabaseServer } from "@/lib/supabaseServer";
import { cosineSimilarity, keywordMatchScore, toneAnalysisScore } from "@/lib/selfLearning/utils";

export type FeedbackReport = {
  userInput: string;
  medxAnswer: string;
  baselineAnswer: string;
  similarity: number;
  keywordScore: number;
  toneScore: number;
  diverges: boolean;
  timestamp: string;
};

const THRESHOLD = Number(process.env.FEEDBACK_THRESHOLD || 0.7);

async function saveAutoFeedback(row: {
  conversationId?: string;
  messageId?: string;
  mode?: string;
  model?: string;
  userInput: string;
  medxAnswer: string;
  baselineAnswer: string;
  similarity: number;
  keywordScore: number;
  toneScore: number;
  diverges: boolean;
  latencyMs?: number;
}) {
  try {
    await supabaseServer()
      .from("ai_auto_feedback")
      .insert({
        conversation_id: row.conversationId ?? null,
        message_id: row.messageId ?? null,
        mode: row.mode ?? null,
        model: row.model ?? null,
        user_input: row.userInput,
        medx_answer: row.medxAnswer,
        baseline_answer: row.baselineAnswer,
        similarity: row.similarity,
        keyword_score: row.keywordScore,
        tone_score: row.toneScore,
        diverges: row.diverges,
        latency_ms: row.latencyMs ?? null,
      });
  } catch {
    // ignore db errors
  }
}

type EvalMeta = {
  conversationId?: string;
  messageId?: string;
  mode?: string;
  model?: string;
  baselineAnswer?: string;
  latencyMs?: number;
};

export async function evaluateResponseAccuracy(
  userInput: string,
  medxAnswer: string,
  meta: EvalMeta = {}
): Promise<FeedbackReport> {
  const baseline = meta.baselineAnswer ?? (await openaiText([{ role: "user", content: userInput }]));
  const similarity = cosineSimilarity(medxAnswer, baseline);
  const keywordScore = keywordMatchScore(medxAnswer, baseline);
  const toneScore = toneAnalysisScore(medxAnswer);
  const report: FeedbackReport = {
    userInput,
    medxAnswer,
    baselineAnswer: baseline,
    similarity,
    keywordScore,
    toneScore,
    diverges: similarity < THRESHOLD,
    timestamp: new Date().toISOString(),
  };
  await saveAutoFeedback({
    conversationId: meta.conversationId,
    messageId: meta.messageId,
    mode: meta.mode,
    model: meta.model,
    userInput,
    medxAnswer,
    baselineAnswer: baseline,
    similarity,
    keywordScore,
    toneScore,
    diverges: report.diverges,
    latencyMs: meta.latencyMs,
  });
  return report;
}
