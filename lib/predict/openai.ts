import OpenAI from "openai";
import type { PredictionBundle } from "./types";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is required");
}
const client = new OpenAI({ apiKey });

export type PredictionReport = {
  risks: Array<{ condition: string; band: "Low" | "Moderate" | "High"; prob?: string }>;
  drivers: Array<{ metric: string; pattern: string; cites: string[] }>;
  next_steps: string[];
  uncertainties: string[];
  citations: string[]; // file:page:chunk refs
};

export async function runOpenAI(bundle: PredictionBundle): Promise<PredictionReport> {
  const sys = [
    "You are Second Opinion (clinical).",
    "You receive: structured (profile, observations, labs, meds) AND unstructured report text chunks.",
    "Tasks: dedupe, normalize units/dates, compute derived metrics, run calculators when inputs exist, resolve contradictions.",
    "Output ONLY JSON with keys: risks, drivers, next_steps, uncertainties, citations."
  ].join("\n");

  const user = JSON.stringify({
    structured: {
      profile: bundle.profile,
      observations: bundle.observations,
      labs: bundle.labs,
      meds: bundle.meds
    },
    unstructured_chunks: (bundle.chunks || []).map(c => ({ ref: c.ref, text: c.text }))
  });

  const model = process.env.OPENAI_TEXT_MODEL || "gpt-5";
  const r = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: sys }, { role: "user", content: user }]
  });

  const content = r.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch {
    return { risks: [], drivers: [], next_steps: [], uncertainties: ["parse_error"], citations: [] };
  }
}
