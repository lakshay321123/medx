// lib/therapy/summarizer.ts
type Role = "system" | "user" | "assistant";
export type ChatMessage = { role: Role; content: string };

export type TherapyNoteJSON = {
  summary: string;                  // <= 280 chars, plain text
  topics: string[];                 // e.g., ["work stress","sleep"]
  triggers: string[];               // e.g., ["criticism from boss"]
  emotions: string[];               // e.g., ["anxious","tired"]
  mood?: string;                    // single label, e.g., "anxious" or "hopeful"
  breakthrough?: string;            // short sentence
  nextStep?: string;                // short suggested/accepted step
};

const JSON_SCHEMA_EXAMPLE: TherapyNoteJSON = {
  summary: "We explored how work stress affects sleep and agreed to try a wind-down routine.",
  topics: ["work stress","sleep"],
  triggers: ["late-night emails","meetings with boss"],
  emotions: ["anxious","overwhelmed"],
  mood: "anxious",
  breakthrough: "User recognized they avoid conflict which increases stress.",
  nextStep: "Try a 20-minute wind-down routine before bed for 3 nights."
};

const SYS = `
You produce a STRICT JSON object that summarizes a supportive conversation.
Return ONLY JSON. No markdown.

Rules:
- Keep "summary" <= 280 chars, plain text.
- "topics","triggers","emotions": max 5 items each, lowercase simple phrases.
- "mood": ONE word from: calm, hopeful, content, neutral, anxious, sad, angry, tired, overwhelmed, stressed.
- "breakthrough" and "nextStep": short one-liners if applicable; else omit.

Respond ONLY with a JSON object matching this TypeScript shape:
${JSON.stringify(JSON_SCHEMA_EXAMPLE, null, 2)}
`;

function safeClamp(note: TherapyNoteJSON): TherapyNoteJSON {
  const clamp = (s?: string) => (s || "").replace(/\s+/g, " ").trim();
  const clip = (s: string, n = 280) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  const arr = (a?: string[]) => (Array.isArray(a) ? a.slice(0, 5).map(clamp) : []);
  const moodList = ["calm","hopeful","content","neutral","anxious","sad","angry","tired","overwhelmed","stressed"];
  const mood = note.mood && moodList.includes(note.mood) ? note.mood : undefined;
  return {
    summary: clip(clamp(note.summary || "")),
    topics: arr(note.topics),
    triggers: arr(note.triggers),
    emotions: arr(note.emotions),
    mood,
    breakthrough: note.breakthrough ? clip(clamp(note.breakthrough), 160) : undefined,
    nextStep: note.nextStep ? clip(clamp(note.nextStep), 160) : undefined
  };
}

export async function summarizeTherapyJSON(openai: any, thread: ChatMessage[]): Promise<TherapyNoteJSON | null> {
  try {
    const resp = await openai.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-5",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYS },
        // Only pass the last ~12 turns for brevity; adjust as needed.
        ...thread.slice(-12)
      ]
    });
    const text = resp.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(text) as TherapyNoteJSON;
    return safeClamp(parsed);
  } catch {
    return null; // fail-soft; we won't block the reply if summarization fails
  }
}

