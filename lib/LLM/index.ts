// lib/LLM/index.ts
// One adapter that respects your existing envs:
// - Groq (LLM) via OpenAI-compatible baseURL (LLM_BASE_URL, LLM_MODEL_ID, LLM_API_KEY)
// - OpenAI GPT-5 for strict JSON validation (OPENAI_TEXT_MODEL, OPENAI_API_KEY)

import OpenAI from "openai";

export type Msg = { role: "system" | "user" | "assistant"; content: string };

function openaiClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}
function groqClient() {
  // Groq exposes an OpenAI-compatible API; we just change baseURL + key
  return new OpenAI({
    apiKey: process.env.LLM_API_KEY!,
    baseURL: process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1"
  });
}

export const AiDocJsonSchema = {
  name: "AiDocOut",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      reply_patient: { type: "string" },
      reply_doctor:  { type: "string" },
      observations: {
        type: "object",
        additionalProperties: false,
        properties: {
          short: { type: "string" },
          long:  { type: "string" }
        },
        required: ["short","long"]
      },
      save: {
        type: "object",
        additionalProperties: false,
        properties: {
          medications: { type: "array", items: { type: "object" } },
          conditions:  { type: "array", items: { type: "object" } },
          labs:        { type: "array", items: { type: "object" } }
        },
        required: ["medications","conditions","labs"]
      }
    },
    required: ["observations","save"]
  }
};

// STRICT JSON validation/corrections → OpenAI GPT-5
export async function validateJson(system: string, instruction: string, user: string): Promise<any> {
  const client = openaiClient();
  const model  = process.env.OPENAI_TEXT_MODEL || "gpt-5";

  const r = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "system", content: instruction },
      { role: "user",   content: user }
    ],
    response_format: { type: "json_schema", json_schema: AiDocJsonSchema }
  });
  const raw = r.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(raw); }
  catch {
    return {
      reply_patient:"", reply_doctor:"",
      observations:{ short:"", long:"" },
      save:{ medications:[], conditions:[], labs:[] }
    };
  }
}

// Final narrative / summaries → Groq (LLM)
export async function finalize(messages: Msg[]): Promise<string> {
  const client = groqClient();
  const model  = process.env.LLM_MODEL_ID || "llama-3.1-70b";

  const r = await client.chat.completions.create({
    model,
    temperature: 0.1,
    messages
  });
  return r.choices?.[0]?.message?.content?.trim() || "";
}

const LLM = { validateJson, finalize };
export default LLM;
