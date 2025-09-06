import { MedxResponseSchema, type MedxResponse } from "@/schemas/medx";
import { normalizeTopic } from "@/lib/topic/normalize";
import { searchTrials } from "@/lib/trials/search";
import { splitFollowUps } from "./splitFollowUps";

export { splitFollowUps };

const BASE = process.env.LLM_BASE_URL!;
const MODEL = process.env.LLM_MODEL_ID || "llama-3.1-8b-instant";
const KEY = process.env.LLM_API_KEY!;

const BASE_PROMPT = `India-aware; metric units.
Patient = simple + home care + ≥3 red flags + when_to_test.
Doctor = DDx + tests + initial management + ICD examples.
If research requested: fill evidence (patient/doctor voice) or Research schema.
Prefer WHO/ICMR/MoHFW/NHP or high-quality sources.
Output ONLY JSON matching schema; end with </END_JSON>.`;

async function groq(messages: any[], max_tokens: number) {
  const res = await fetch(`${BASE.replace(/\/$/,"")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.25,
      top_p: 0.9,
      max_tokens,
      stop: ["</END_JSON>"],
      messages,
    }),
  });
  return res.json();
}

function stripSentinel(text: string): string {
  return text.replace(/<\/END_JSON>.*/i, "").trim();
}

export async function v2Generate(body: any): Promise<MedxResponse> {
  const max = body.mode === "patient" ? 800 : 1200;
  const topic = normalizeTopic(body.condition || "");
  let trials: any[] = [];
  if (body.research || body.mode === "research") {
    trials = await searchTrials(topic);
  }
  const sys = (body.research || body.mode === "research")
    ? `${BASE_PROMPT}\nTopic-Lock: The topic is ${topic.canonical}. Exclude results that do not clearly match this topic and anatomy. If no on-topic results remain, say so and suggest 2–3 synonyms users can try. Do not include unrelated studies.`
    : BASE_PROMPT;
  const userPayload = { ...body, topic: topic.canonical, synonyms: topic.synonyms, trials };
  const messages = [
    { role: "system", content: sys },
    { role: "user", content: JSON.stringify(userPayload) },
  ];
  const raw = await groq(messages, max);
  const txt = stripSentinel(raw.choices?.[0]?.message?.content || "");
  let parsed: any;
  try {
    parsed = JSON.parse(txt);
  } catch {
    parsed = {};
  }
  let out = MedxResponseSchema.safeParse(parsed);
  if (!out.success) {
    const fix = await groq([
      { role: "system", content: "Fix JSON to match schema. Return JSON only." },
      { role: "user", content: txt },
      { role: "assistant", content: JSON.stringify(out.error.issues) },
    ], max);
    const fixed = stripSentinel(fix.choices?.[0]?.message?.content || "");
    const fixedParsed = JSON.parse(fixed);
    out = MedxResponseSchema.safeParse(fixedParsed);
    if (!out.success) throw new Error("Schema validation failed");
  }
  return out.data;
}

export function shortSummary(x: MedxResponse): string {
  if (x.mode === "patient") {
    const step = x.home_care?.[0] ?? "rest and fluids";
    const rf = x.red_flags?.[0] ? ` Seek care if: ${x.red_flags[0]}.` : "";
    return `${x.condition}: ${x.what_it_is}. Do now: ${step}.${rf}`;
  }
  if (x.mode === "doctor") {
    const ddx = (x as any).differential?.slice(0, 2).join(", ") || "";
    const start = (x as any).initial_management?.[0] ?? "per clinical context";
    return `${x.condition}: ${x.what_it_is}. DDx: ${ddx}. Start: ${start}.`;
  }
  const kf = (x as any).key_findings?.[0]
    ? ` Key finding: ${(x as any).key_findings[0]}.`
    : "";
  return `${x.condition}: ${x.what_it_is}.${kf}`;
}

