import { openaiText } from "@/lib/llm";
import { cosineSimilarity, keywordMatchScore, toneAnalysisScore } from "@/lib/selfLearning/utils";
import { promises as fs } from "fs";
import path from "path";

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

const LOG_PATH = process.env.FEEDBACK_LOG_PATH || path.join(process.cwd(), "data", "feedbackLogs.json");
const THRESHOLD = Number(process.env.FEEDBACK_THRESHOLD || 0.7);

async function appendLog(report: FeedbackReport) {
  try {
    const prev = await fs.readFile(LOG_PATH, "utf8").catch(() => "[]");
    const arr = JSON.parse(prev);
    arr.push(report);
    await fs.writeFile(LOG_PATH, JSON.stringify(arr, null, 2));
  } catch {
    // ignore logging errors
  }
}

export async function evaluateResponseAccuracy(
  userInput: string,
  medxAnswer: string,
  baselineAnswer?: string
): Promise<FeedbackReport> {
  const baseline = baselineAnswer ?? (await openaiText([{ role: "user", content: userInput }]));
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
  await appendLog(report);
  return report;
}
