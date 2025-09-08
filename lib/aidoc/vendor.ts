import OpenAI from "openai";

const oai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  timeout: Number(process.env.AIDOC_MODEL_TIMEOUT_MS || 25000),
  maxRetries: 0, // we manage our own soft timeout
});

// --- tiny local helpers (kept inline to avoid new files) ---
function stripFences(s: string) {
  const m = typeof s === "string" && s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return m ? m[1] : s;
}
function safeParse(raw: any): any {
  if (raw && typeof raw !== "string") return raw;
  const s0 = (raw || "").trim();
  try { return JSON.parse(s0); } catch {}
  const s1 = String(stripFences(s0)).trim();
  try { return JSON.parse(s1); } catch {}
  for (let i = s1.length - 1; i >= 0; i--) {
    if (s1[i] === "}") { try { return JSON.parse(s1.slice(0, i + 1)); } catch {} }
  }
  return null;
}

type CallIn = { system: string; user: string; instruction: string };
export async function callOpenAIJson({ system, user, instruction }: CallIn): Promise<any> {
  const model = process.env.AIDOC_MODEL || "gpt-5"; // ✅ default GPT-5
  const SOFT = Number(process.env.AIDOC_SOFT_TIMEOUT_MS || 18000); // abort before platform deadline
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort("soft-timeout"), SOFT);
  try {
    const resp = await oai.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `${instruction}\n\nUSER:\n${user}` },
      ],
    }, { signal: ctl.signal });
    const content = (resp.choices?.[0]?.message?.content ?? "").trim();
    const parsed = safeParse(content);
    if (parsed && typeof parsed === "object") {
      // fill safe defaults so callers always get a full shape
      return {
        reply: "",
        save: { medications: [], conditions: [], labs: [], notes: [], prefs: [] },
        observations: { short: "", long: "" },
        ...parsed,
      };
    }
    return {
      reply: content || "I captured your note. I’ll avoid quoting stale labs and suggest repeats when needed.",
      save: { medications: [], conditions: [], labs: [], notes: [], prefs: [] },
      observations: { short: "Model returned non-JSON. Using safe fallback.", long: "" },
      _warn: "non-json",
    };
  } catch (err: any) {
    return {
      reply: "I noted your message and saved any clear preferences. I’m having trouble reaching the model right now.",
      save: { medications: [], conditions: [], labs: [], notes: [], prefs: [] },
      observations: {
        short: "Temporary AI connectivity issue — proceeding safely without quoting stale labs.",
        long: "I won’t quote lab values older than 90 days. If a result is needed and stale, I’ll suggest repeating it.",
      },
      _error: { name: String(err?.name || "LLMError"), message: String(err?.message || "Unknown") }
    };
  } finally {
    clearTimeout(timer);
  }
}

