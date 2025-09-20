import { callAiDocWithFallback } from "@/lib/llm/aidocFailover";
import type { NormalizedAiDocMessage } from "@/lib/llm/compat";

export type Msg = NormalizedAiDocMessage;

const EMPTY_STRUCTURED = {
  reply_patient: "",
  reply_doctor: "",
  observations: { short: "", long: "" },
  save: { medications: [], conditions: [], labs: [] },
};

export async function validateJson(system: string, instruction: string, user: string): Promise<any> {
  const messages: Msg[] = [
    { role: "system", content: system },
    { role: "system", content: instruction },
    { role: "user", content: user },
  ];

  try {
    const { reply } = await callAiDocWithFallback({ messages, temperature: 0.2 });
    const parsed = JSON.parse(reply || "{}");
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return EMPTY_STRUCTURED;
  } catch (err) {
    console.error("validateJson failed", err);
    return EMPTY_STRUCTURED;
  }
}

export async function finalize(messages: Msg[]): Promise<string> {
  try {
    const { reply } = await callAiDocWithFallback({ messages, temperature: 0.1 });
    return (reply || "").trim();
  } catch (err) {
    console.error("finalize failed", err);
    return "";
  }
}

const LLM = { validateJson, finalize };
export default LLM;
