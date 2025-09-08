import OpenAI from "openai";

export type Enriched = {
  personality: Record<string, "low" | "moderate" | "high">;  // e.g., { avoidance:"moderate", self_criticism:"high" }
  values: Record<string, boolean>;                           // e.g., { stability:true, autonomy:true }
  supports: Record<string, number>;                          // e.g., { partner:3, friend:2 }
};

const SYS = `
You produce STRICT JSON describing a user's likely tendencies from recent therapy notes.
Return ONLY a JSON object with keys: personality, values, supports.

Rules:
- personality: up to 6 facets with values "low" | "moderate" | "high".
  Use neutral labels like: avoidance, self_criticism, conflict_avoidance, resilience, self_compassion, anxiety_tone.
- values: up to 6 booleans (true) for what seems important (e.g., stability, autonomy, family, achievement, health, connection).
- supports: names and relative counts for supportive people/entities mentioned (e.g., partner, friend, sibling, mentor).
`;

export async function enrichProfileJSON(openai: OpenAI, input: {
  topics: Record<string, number>;
  triggers: Record<string, number>;
  mood_stats: { baseline: string; counts: Record<string, number> };
  recent_goals: string[];
  samples: Array<{ summary: string; emotions?: string[] }>;
}): Promise<Enriched | null> {
  try {
    const content = JSON.stringify(input);
    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-5",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYS },
        { role: "user", content }
      ]
    });
    const txt = res.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(txt) as Enriched;

    // Clamp sizes
    const clampObj = (o: Record<string, any>, max = 6) =>
      Object.fromEntries(Object.entries(o || {}).slice(0, max));

    const p = clampObj(parsed.personality || {}, 6);
    const v = clampObj(parsed.values || {}, 6);
    const s = clampObj(parsed.supports || {}, 6);

    // Validate facet values
    for (const k of Object.keys(p)) {
      if (!["low", "moderate", "high"].includes(p[k])) delete p[k];
    }
    return { personality: p, values: v, supports: s };
  } catch {
    return null;
  }
}

