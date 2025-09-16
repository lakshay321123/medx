import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type Bundle = Awaited<ReturnType<typeof import("./assemble").assembleBundle>>;
export type PredictionReport = {
  risks: Array<{ condition: string; band: "Low" | "Moderate" | "High"; prob?: string }>;
  drivers: Array<{ metric: string; pattern: string; cites: string[] }>;
  next_steps: string[];
  uncertainties: string[];
  citations: string[];
};

export async function runOpenAI(bundle: Bundle): Promise<PredictionReport> {
  const sys = [
    "You are Second Opinion (clinical).",
    "Input: structured (profile, observations, labs, meds) + unstructured (report text chunks).",
    "Normalize units/dates, de-duplicate, compute derived metrics, run calculators when inputs exist.",
    "Resolve contradictions; keep unknowns explicit. Output ONLY JSON in this schema:",
    "{ risks:[], drivers:[], next_steps:[], uncertainties:[], citations:[] }",
  ].join("\n");

  const user = JSON.stringify({
    structured: {
      profile: bundle.profile,
      observations: bundle.observations,
      labs: bundle.labs,
      meds: bundle.meds,
    },
    unstructured_chunks: bundle.chunks.map((c: any) => ({
      ref: `${c.file_id}:${c.page}:${c.chunk_index}`,
      text: c.content,
    })),
  });

  const model = process.env.OPENAI_TEXT_MODEL || "gpt-5";
  const r = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
  });

  const content = r.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch {
    return { risks: [], drivers: [], next_steps: [], uncertainties: ["parse_error"], citations: [] };
  }
}
