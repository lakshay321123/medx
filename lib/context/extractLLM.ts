import { ConversationState } from "./state";

type ExtractOutput = {
  topic?: string;
  intents?: string[];
  facts?: Record<string,string>;
  preferences?: Record<string,string>;
  decisions?: string[];
  open_questions?: string[];
};

const USE_LLM = !!process.env.OPENAI_API_KEY;

async function llmExtract(user: string, assistant?: string): Promise<ExtractOutput> {
  // Replace with your LLM client. Example payload (pseudo):
  // - ask model to fill JSON keys exactly; temperature low.
  const prompt = `
You are an information extractor. From the conversation lines below, extract:
- topic (short),
- intents (array of short tags),
- facts (key->string),
- preferences (key->string),
- decisions (array),
- open_questions (array).
Return ONLY JSON.

<conversation>
USER: ${user}
ASSISTANT: ${assistant ?? ""}
</conversation>
  `.trim();

  // Pseudo-call — plug your client. If not available, fallback to heuristics below.
  // const json = await callOpenAIJSON(prompt, process.env.M3_EXTRACTION_MODEL || "gpt-4o-mini");
  // return json as ExtractOutput;

  throw new Error("LLM not configured");
}

function heuristics(user: string, assistant?: string): ExtractOutput {
  const t = `${user}\n${assistant ?? ""}`.toLowerCase();
  const facts: Record<string,string> = {};
  const prefs: Record<string,string> = {};
  const intents: string[] = [];
  const decisions: string[] = [];
  const open: string[] = [];

  const kg = t.match(/(\d{2,3})\s?kg/); if (kg) facts.weight = `${kg[1]} kg`;
  const cm = t.match(/(\d{3})\s?cm/);  if (cm) facts.height = `${cm[1]} cm`;
  if (/\bnon[-\s]?veg\b|chicken|fish|egg/.test(t)) prefs.diet = "non-veg";
  else if (/\bveg\b/.test(t)) prefs.diet = "veg";

  if (/abs|core|six[-\s]?pack|bmi|diet|protein|workout|exercise/.test(t)) intents.push("fitness");
  if (/trial|nsclc|phase|egfr|alk|kras|recruiting/.test(t)) intents.push("trials");
  if (/ui|mockup|palette|color|tailwind/.test(t)) intents.push("ui_design");

  if (intents.includes("fitness") && !prefs.diet) open.push("diet preference");

  let topic: string | undefined =
    /abs|core|six[-\s]?pack/.test(t) ? "fitness/abs" :
    /trials|nsclc/.test(t) ? "oncology/trials" :
    /ui|palette|mockup|color/.test(t) ? "ui/design" :
    undefined;

  return { topic, intents, facts, preferences: prefs, decisions, open_questions: open };
}

export async function extractContext(user: string, assistant?: string): Promise<ExtractOutput> {
  if (USE_LLM) {
    try { return await llmExtract(user, assistant); } catch {}
  }
  return heuristics(user, assistant);
}

export function mergeInto(prev: ConversationState, x: ExtractOutput): ConversationState {
  return {
    topic: x.topic || prev.topic,
    intents: Array.from(new Set([...(x.intents || []), ...(prev.intents || [])])).slice(0, 8),
    facts: { ...prev.facts, ...(x.facts || {}) },
    preferences: { ...prev.preferences, ...(x.preferences || {}) },
    decisions: Array.from(new Set([...(prev.decisions || []), ...(x.decisions || [])])),
    open_questions: Array.from(new Set([...(prev.open_questions || []), ...(x.open_questions || [])])),
    last_updated_iso: new Date().toISOString(),
  };
}
