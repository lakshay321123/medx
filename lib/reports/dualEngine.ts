export interface DualEngineInput {
  kind: "lab" | "generic";
  rawText: string;
  facts?: any;
  calcFacts?: any;
  region: string;
  assumeAdultIfUnknown: boolean;
  maxReviewPasses: number;
}

function buildAssumptions(input: DualEngineInput): string[] {
  const out: string[] = [];
  if (input.assumeAdultIfUnknown) out.push("Adult");
  out.push(`Region=${input.region}`);
  return out;
}

function buildPayload(input: DualEngineInput, assumptions: string[]) {
  return {
    rawText: input.rawText,
    facts: input.facts,
    calcFacts: input.calcFacts,
    assumptions,
  };
}

async function callLLM(messages: any[]): Promise<any> {
  const providers = [
    {
      url: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      key: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
    },
    {
      url: process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1",
      key: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL_ID || "llama-3.1-70b-versatile",
    },
  ];
  for (const p of providers) {
    if (!p.key) continue;
    try {
      const r = await fetch(`${p.url}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${p.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: p.model, messages, temperature: 0.2 }),
      });
      const j = await r.json();
      if (r.ok) {
        const content = j.choices?.[0]?.message?.content || "{}";
        try {
          return JSON.parse(content);
        } catch {
          return {};
        }
      }
    } catch {}
  }
  return {};
}

async function llmSummarize(payload: any) {
  const messages = [
    {
      role: "system",
      content:
        "You are a cautious medical assistant. Use facts if available. Prefer neutral language. No prescribing. Output only the specified JSON schema (same fields as current app).",
    },
    { role: "user", content: JSON.stringify(payload) },
  ];
  return callLLM(messages);
}

async function llmRevise(input: any) {
  const { draft, payload, disc } = input;
  const messages = [
    {
      role: "system",
      content:
        "You previously produced a draft. The following discrepancies were detected vs facts/raw. Correct them. If facts are ambiguous, state uncertainty and choose the safer neutral interpretation. Output only the JSON schema.",
    },
    {
      role: "user",
      content: JSON.stringify({
        draft,
        discrepancies: disc.issues || [],
        rawFactsSnippet: payload.facts || payload.calcFacts || {},
        calcFactsSubset: payload.calcFacts || [],
      }),
    },
  ];
  return callLLM(messages);
}

function textOfDraft(draft: any): string {
  const parts: string[] = [];
  if (typeof draft === "string") return draft;
  if (!draft) return "";
  if (draft.overall) parts.push(String(draft.overall));
  if (Array.isArray(draft.sections)) {
    for (const s of draft.sections) {
      if (typeof s === "string") parts.push(s);
      else if (s?.text) parts.push(String(s.text));
      else if (s?.summary) parts.push(String(s.summary));
    }
  }
  if (draft.next_steps) parts.push(String(draft.next_steps));
  return parts.join(" \n").toLowerCase();
}

function findDiscrepancies(draft: any, payload: any) {
  const text = textOfDraft(draft);
  let count = 0;
  const issues: any[] = [];
  const measurements = payload?.facts?.measurements || [];
  for (const m of measurements) {
    const name = (m.canonical || "").toLowerCase();
    const flag = (m.flag || "").toLowerCase();
    if (!name || !flag || flag === "normal" || flag === "unknown") continue;
    const idx = text.indexOf(name.toLowerCase());
    if (idx >= 0) {
      const snippet = text.slice(Math.max(0, idx - 20), idx + 20);
      if (flag === "high" && /(low|normal)/.test(snippet)) {
        issues.push({ id: name, expected: "high" });
        count++;
      }
      if (flag === "low" && /(high|normal)/.test(snippet)) {
        issues.push({ id: name, expected: "low" });
        count++;
      }
    }
  }
  return { material: count > 0, count, issues };
}

function stripImperatives(obj: any, rx: RegExp): any {
  if (typeof obj === "string") return obj.replace(rx, "");
  if (Array.isArray(obj)) return obj.map(v => stripImperatives(v, rx));
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const k of Object.keys(obj)) out[k] = stripImperatives(obj[k], rx);
    return out;
  }
  return obj;
}

function estimateCoverage(payload: any): number {
  const total = payload?.facts?.measurements?.length || payload?.calcFacts?.length || 0;
  if (!total) return 0;
  return 1;
}

export async function dualEngineSummarize(input: DualEngineInput) {
  const assumptions = buildAssumptions(input);
  const payload = buildPayload(input, assumptions);

  let draft = await llmSummarize(payload);
  let disc = findDiscrepancies(draft, payload);

  let reviewPasses = 0;
  while (disc.material && reviewPasses < input.maxReviewPasses) {
    draft = await llmRevise({ draft, payload, disc });
    disc = findDiscrepancies(draft, payload);
    reviewPasses++;
  }

  if (process.env.REPORT_VERB_SANITIZER === "true") {
    draft = stripImperatives(draft, /(take|give|use|apply|administer|consume)/gi);
  }

  draft.meta = {
    ...(draft.meta || {}),
    audit: {
      calc_coverage_pct: estimateCoverage(payload),
      discrepancies_found: disc.count,
      llm_review_passes: reviewPasses,
      assumptions_applied: assumptions,
      models: { text: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini" },
    },
  };

  return draft;
}
