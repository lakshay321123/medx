import OpenAI from "openai";
import { safeParseJson, withDefaults } from "@/lib/utils/safeJson";

const timeout = Number(process.env.AIDOC_MODEL_TIMEOUT_MS || 25000);

type CallIn = { system: string; user: string; instruction: string };

export async function callOpenAIJson({ system, user, instruction }: CallIn): Promise<any> {
  const model = process.env.AIDOC_MODEL || "gpt-5"; // ✅ default GPT-5
  try {
    const oai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
      timeout,
    });
    const resp = await oai.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `${instruction}\n\nUSER:\n${user}` },
      ],
    });

    const content = (resp.choices?.[0]?.message?.content ?? "").trim();
    const parsed = safeParseJson(content);
    if (parsed.ok) {
      return withDefaults(parsed.data, {
        reply: "",
        save: { medications: [], conditions: [], labs: [], notes: [], prefs: [] },
        observations: { short: "", long: "" },
      });
    } else {
      // Model ignored JSON mode — safe fallback
      const reason = (parsed as { ok: false; error: string }).error;
      return {
        reply: content || "I captured your note. I’ll avoid quoting stale labs and suggest repeats when needed.",
        save: { medications: [], conditions: [], labs: [], notes: [], prefs: [] },
        observations: { short: "Model returned non-JSON. Using safe fallback.", long: "" },
        _warn: { reason }
      };
    }
  } catch (err: any) {
    // Resilient fallback (prevents 504s and client JSON errors)
    return {
      reply: "I noted your message and saved any clear preferences. I’m having trouble reaching the model right now.",
      save: { medications: [], conditions: [], labs: [], notes: [], prefs: [] },
      observations: {
        short: "Temporary AI connectivity issue — proceeding safely without quoting stale labs.",
        long: "I won’t quote lab values older than 90 days. If a result is needed and stale, I’ll suggest repeating it."
      },
      _error: { name: String(err?.name || "LLMError"), message: String(err?.message || "Unknown") }
    };
  }
}
