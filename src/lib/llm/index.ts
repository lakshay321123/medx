import { finalize as finalizeAiDoc, validateJson as validateAiDocJson, type Msg } from "../../../lib/LLM";
import {
  askLLM,
  createLLM,
  groqChat,
  mergeSummaries,
  openaiText,
  openaiVision,
  type ChatMsg,
} from "../../../lib/llm";
import { callGroq } from "../../../lib/llm/groq";
import type { ChatCompletionMessageParam } from "../../../lib/llm/types";

export { askLLM, createLLM, groqChat, mergeSummaries, openaiText, openaiVision, callGroq };
export type { ChatMsg, ChatCompletionMessageParam, Msg };
export const validateJson = validateAiDocJson;
export const finalize = finalizeAiDoc;

const LLM = {
  validateJson: validateAiDocJson,
  finalize: finalizeAiDoc,
};

export default LLM;
