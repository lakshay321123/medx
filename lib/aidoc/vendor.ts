import OpenAI from "openai";

export const AiDocJsonSchema = {
  name: "AiDocOut",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      reply: { type: "string" },
      reply_patient: { type: "string" },
      reply_doctor: { type: "string" },
      observations: {
        type: "object",
        additionalProperties: false,
        properties: {
          short: { type: "string" },
          long: { type: "string" }
        },
        required: ["short"]
      },
      save: {
        type: "object",
        additionalProperties: false,
        properties: {
          medications: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                dose: { type: "string" },
                since: { type: "string" },
                stoppedAt: { type: "string" }
              },
              required: ["name"]
            }
          },
          conditions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                code: { type: "string" },
                label: { type: "string" },
                status: { type: "string", enum: ["active", "resolved"] },
                since: { type: "string" }
              },
              required: ["label"]
            }
          },
          labs: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                panel: { type: "string" },
                name: { type: "string" },
                value: { anyOf: [{ type: "string" }, { type: "number" }] },
                unit: { type: "string" },
                normalLow: { type: "number" },
                normalHigh: { type: "number" },
                takenAt: { type: "string" },
                abnormal: { anyOf: [{ type: "string" }, { type: "null" }] }
              },
              required: ["name"]
            }
          },
          notes: { type: "array", items: { type: "string" } },
          prefs: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                key: { type: "string" },
                value: { type: "string" }
              },
              required: ["key", "value"]
            }
          }
        },
        required: ["medications", "conditions", "labs", "notes", "prefs"]
      },
      plan: {
        type: "object",
        additionalProperties: true
      },
      rulesFired: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: ["reply", "observations", "save"]
  },
  strict: true
} as const;

/**
 * Call OpenAI for AI Doc ensuring JSON-only replies.
 */
type CallIn = { system: string; user: string; instruction: string; metadata?: any };

function tryParseJson(s: string) {
  try { return JSON.parse(s); } catch {}
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch {}
  }
  return null;
}

export async function callOpenAIJson({ system, user, instruction, metadata }: CallIn): Promise<any> {
  const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.AIDOC_MODEL || "gpt-5";
  const backoff = [250, 750, 1500];
  let lastErr: any;
  for (let i = 0; i < backoff.length; i++) {
    try {
      const resp = await oai.responses.create({
        model,
        temperature: 0.2,
        input: [
          { role: "system", content: system },
          { role: "user", content: `${instruction}\n\nUSER:\n${user}` },
        ],
        metadata,
        response_format: { type: "json_schema", json_schema: AiDocJsonSchema },
      } as any);
      const text = resp.output_text ?? "";
      const parsed = tryParseJson(text);
      if (!parsed) throw new Error("AIDoc: JSON parse failed");
      return parsed;
    } catch (e) {
      lastErr = e;
      if (i < backoff.length - 1) await new Promise(r => setTimeout(r, backoff[i]));
    }
  }
  console.error("callOpenAIJson error", lastErr);
  return {
    reply: "Thanks — I’ll personalize advice using your history. What symptoms are you having today?",
    save: { medications: [], conditions: [], labs: [], notes: [], prefs: [] },
    observations: {
      short: "Let’s gather a bit more info and plan next steps. No stale labs will be quoted.",
      long: "I’ll consider your active conditions. If we need a lab that’s stale, I’ll suggest a repeat.",
    },
  };
}
