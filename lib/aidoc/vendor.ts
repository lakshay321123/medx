import OpenAI from "openai";
import { withRetries } from "@/lib/llm/retry";
import { shouldModelFallback } from "@/lib/llm/fallback";

/**
 * Call OpenAI for AI Doc ensuring JSON-only replies.
 */
type CallIn = { system: string; user: string; instruction: string };

export async function callOpenAIJson({ system, user, instruction }: CallIn): Promise<any> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const MODEL_PRIMARY = process.env.AIDOC_MODEL || process.env.OPENAI_TEXT_MODEL || "gpt-5";
  const MODEL_FALLBACK = process.env.OPENAI_FALLBACK_MODEL || "gpt-5-mini";
  const messages = [
    { role: "system", content: system },
    { role: "user", content: `${instruction}\n\nUSER:\n${user}` },
  ];
  try {
    const resp = await withRetries(async () => {
      try {
        return await openai.chat.completions.create(
          {
            model: MODEL_PRIMARY,
            messages: messages as any,
            temperature: 0.2,
            response_format: { type: "json_object" },
          },
          { timeout: 30000 }
        );
      } catch (e: any) {
        if (shouldModelFallback(e) && MODEL_FALLBACK !== MODEL_PRIMARY) {
          return await openai.chat.completions.create(
            {
              model: MODEL_FALLBACK,
              messages: messages as any,
              temperature: 0.2,
              response_format: { type: "json_object" },
            },
            { timeout: 30000 }
          );
        }
        throw e;
      }
    });
    const content = resp.choices?.[0]?.message?.content ?? "{}";
    return JSON.parse(content);
  } catch (e) {
    console.error("callOpenAIJson error", e);
    // Fallback stub for dev or failure
    return {
      reply: "Thanks — I’ll personalize advice using your history. What symptoms are you having today?",
      save: { medications: [], conditions: [], labs: [], notes: [], prefs: [] },
      observations: {
        short: "Let’s gather a bit more info and plan next steps. No stale labs will be quoted.",
        long: "I’ll consider your active conditions. If we need a lab that’s stale, I’ll suggest a repeat.",
      },
    };
  }
}
