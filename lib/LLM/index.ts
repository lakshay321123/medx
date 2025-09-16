import OpenAI from "openai";
import Groq from "groq-sdk";

export type Msg = { role: "system" | "user" | "assistant"; content: string };

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
        properties: { short: { type: "string" }, long: { type: "string" } },
        required: ["short","long"]
      },
      save: {
        type: "object",
        additionalProperties: false,
        properties: {
          medications: { type: "array", items: { type: "object" } },
          conditions:  { type: "array", items: { type: "object" } },
          labs:        { type: "array", items: { type: "object" } },
        },
        required: ["medications","conditions","labs"]
      }
    },
    required: ["observations","save"]
  }
};

export const LLM = {
  // Strict JSON validation / corrections -> OpenAI (GPT-5)
  async validateJson(system: string, instruction: string, user: string): Promise<any> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const model = process.env.OPENAI_MODEL_GPT5 || "gpt-5";
    const r = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "system", content: instruction },
        { role: "user", content: user }
      ],
      response_format: { type: "json_schema", json_schema: AiDocJsonSchema },
      temperature: 0.2
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
  },

  // Final narrative / summary -> Groq
  async finalize(messages: Msg[]): Promise<string> {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
    const model = process.env.GROQ_MODEL || "llama-3.1-70b";
    const r = await groq.chat.completions.create({ model, temperature: 0.1, messages });
    return r.choices?.[0]?.message?.content?.trim() || "";
  }
};

export default LLM;
