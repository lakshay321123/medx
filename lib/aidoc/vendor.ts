import OpenAI from "openai";

/**
 * Call OpenAI for AI Doc ensuring JSON-only replies.
 */
type CallIn = { system: string; user: string; instruction: string };

export async function callOpenAIJson({ system, user, instruction }: CallIn): Promise<any> {
  const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.AIDOC_MODEL || "gpt-5";
  try {
    const resp = await oai.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `${instruction}\n\nUSER:\n${user}` },
      ],
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
