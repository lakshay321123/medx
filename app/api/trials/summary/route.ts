import { NextResponse } from "next/server";
import type { TrialFacts, TrialSummaryMarkdown, TrialIntervention, TrialOutcome, TrialSource } from "@/types/trialSummaries";
import { callGroq } from "@/lib/llm/groq";
import type { ChatCompletionMessageParam } from "@/lib/llm/types";

export const runtime = "nodejs";

function coerceString(value: any) {
  return typeof value === "string" && value.trim().length ? value.trim() : null;
}

function coerceNumber(value: any) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function coerceArray<T>(value: any, mapper: (item: any) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const item of value) {
    const mapped = mapper(item);
    if (mapped !== null) out.push(mapped);
  }
  return out;
}

function coerceTrial(input: any): TrialFacts | null {
  if (!input || typeof input !== "object") return null;
  const nctId = coerceString((input as any).nctId)?.toUpperCase();
  if (!nctId || !/^NCT\d{8}$/.test(nctId)) return null;
  const design = (input as any).design ?? {};
  const population = (input as any).population ?? {};
  const outcomes = (input as any).outcomes ?? {};
  const eligibility = (input as any).eligibility ?? {};
  const contacts = (input as any).contacts ?? {};
  const dates = (input as any).dates ?? {};
  const sources = (input as any).sources ?? [];
  return {
    nctId,
    title: coerceString((input as any).title),
    status: coerceString((input as any).status),
    phase: coerceString((input as any).phase),
    studyType: coerceString((input as any).studyType),
    conditions: coerceArray((input as any).conditions, (v) => coerceString(v)),
    design: {
      masking: coerceString(design?.masking),
      allocation: coerceString(design?.allocation),
      model: coerceString(design?.model),
      arms: coerceNumber(design?.arms),
    },
    population: {
      age: coerceString(population?.age),
      sex: coerceString(population?.sex),
      targetEnrollment: coerceNumber(population?.targetEnrollment),
      countries: coerceArray(population?.countries, (v) => coerceString(v)),
    },
    interventions: coerceArray((input as any).interventions, (item) => {
      if (!item || typeof item !== "object") return null;
      const type = coerceString(item.type);
      const name = coerceString(item.name);
      if (!type && !name) return null;
      return {
        type,
        name,
      } as TrialIntervention;
    }),
    outcomes: {
      primary: coerceArray(outcomes?.primary, (item) => {
        if (!item || typeof item !== "object") return null;
        const title = coerceString(item.title);
        if (!title) return null;
        return {
          title,
          timeFrame: coerceString(item.timeFrame),
        } as TrialOutcome;
      }),
    },
    eligibility: {
      keyInclusion: coerceArray(eligibility?.keyInclusion, (v) => coerceString(v)).slice(0, 8),
      keyExclusion: coerceArray(eligibility?.keyExclusion, (v) => coerceString(v)).slice(0, 8),
    },
    contacts: {
      sponsor: coerceString(contacts?.sponsor),
      locationsCount: coerceNumber(contacts?.locationsCount),
    },
    dates: {
      start: coerceString(dates?.start),
      primaryCompletion: coerceString(dates?.primaryCompletion),
      completion: coerceString(dates?.completion),
    },
    sources: coerceArray(sources, (item) => {
      if (!item || typeof item !== "object") return null;
      const label = coerceString(item.label) || "ClinicalTrials.gov";
      const url = coerceString(item.url);
      if (!url) return null;
      return { label, url } as TrialSource;
    }),
    error: coerceString((input as any).error),
  };
}

function chunkTrials<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) {
    out.push(list.slice(i, i + size));
  }
  return out;
}

function joinParts(parts: Array<string | null | undefined>, fallback = "Not reported") {
  const filtered = parts.map((p) => (typeof p === "string" ? p.trim() : "")).filter(Boolean);
  return filtered.length ? filtered.join(" · ") : fallback;
}

function formatInterventions(trial: TrialFacts) {
  const parts = trial.interventions
    .map((i) => [i.type, i.name].filter(Boolean).join(": ").trim())
    .filter(Boolean);
  return parts.length ? parts.join("; ") : "Not reported";
}

function formatOutcomes(trial: TrialFacts) {
  const parts = trial.outcomes.primary
    .map((o) => (o.timeFrame ? `${o.title} (${o.timeFrame})` : o.title))
    .filter(Boolean);
  return parts.length ? parts.join("; ") : "Not reported";
}

function formatEligibilitySection(title: string, values: string[]) {
  if (!values.length) return [] as string[];
  const lines = [`- ${title}:`];
  for (const value of values.slice(0, 4)) {
    lines.push(`  - ${value}`);
  }
  return lines;
}

function formatPopulation(trial: TrialFacts) {
  const parts: string[] = [];
  if (trial.population.age) parts.push(`Age: ${trial.population.age}`);
  if (trial.population.sex) parts.push(`Sex: ${trial.population.sex}`);
  if (typeof trial.population.targetEnrollment === "number")
    parts.push(`Target enrollment: ${trial.population.targetEnrollment}`);
  if (trial.population.countries?.length)
    parts.push(`Countries: ${trial.population.countries.slice(0, 5).join(", ")}`);
  return parts.length ? parts.join(" · ") : "Not reported";
}

function formatDesign(trial: TrialFacts) {
  const parts: string[] = [];
  if (trial.design.model) parts.push(trial.design.model);
  if (trial.design.allocation) parts.push(trial.design.allocation);
  if (trial.design.masking) parts.push(`Masking: ${trial.design.masking}`);
  if (typeof trial.design.arms === "number") parts.push(`${trial.design.arms} arm${trial.design.arms === 1 ? "" : "s"}`);
  return parts.length ? parts.join(" · ") : "Not reported";
}

function formatStatus(trial: TrialFacts) {
  const parts: string[] = [];
  if (trial.status) parts.push(trial.status);
  if (trial.dates.start) parts.push(`Start: ${trial.dates.start}`);
  if (trial.dates.primaryCompletion) parts.push(`Primary completion: ${trial.dates.primaryCompletion}`);
  if (trial.dates.completion) parts.push(`Completion: ${trial.dates.completion}`);
  return parts.length ? parts.join(" · ") : "Not reported";
}

function formatSources(trial: TrialFacts) {
  if (!trial.sources?.length) return "ClinicalTrials.gov";
  return trial.sources
    .map((s) => `[${s.label || "ClinicalTrials.gov"}](${s.url})`)
    .join(", ");
}

function buildTldr(trial: TrialFacts) {
  const parts: string[] = [];
  if (trial.title) parts.push(trial.title);
  if (trial.status) parts.push(trial.status);
  if (trial.phase) parts.push(trial.phase);
  if (trial.interventions.find((i) => i.name)) {
    const first = trial.interventions.find((i) => i.name)?.name;
    if (first) parts.push(first);
  } else if (trial.conditions.length) {
    parts.push(trial.conditions[0]);
  }
  return parts.slice(0, 3).join(" · ") || "See details below.";
}

function formatPlainTrial(trial: TrialFacts): string {
  const lines: string[] = [];
  lines.push(`### ${trial.nctId} — Doctor Brief`);
  lines.push(`**TL;DR:** ${buildTldr(trial)}`);
  lines.push(`**Phase / Type:** ${joinParts([trial.phase, trial.studyType])}`);
  lines.push(`**Population:** ${formatPopulation(trial)}`);
  lines.push(`**Design:** ${formatDesign(trial)}`);
  lines.push(`**Interventions:** ${formatInterventions(trial)}`);
  lines.push(`**Primary outcomes:** ${formatOutcomes(trial)}`);
  lines.push(`**Status / Dates:** ${formatStatus(trial)}`);
  lines.push(`**Key eligibility (short):**`);
  const eligibilityLines = [
    ...formatEligibilitySection("Inclusion", trial.eligibility.keyInclusion),
    ...formatEligibilitySection("Exclusion", trial.eligibility.keyExclusion),
  ];
  if (eligibilityLines.length === 0) {
    lines.push("- Not specified.");
  } else {
    lines.push(...eligibilityLines);
  }
  lines.push(`**Sources:** ${formatSources(trial)}`);
  return lines.join("\n");
}

function parseGroqMarkdown(raw: string, expected: TrialFacts[]): TrialSummaryMarkdown[] | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;
  const sections = trimmed.split(/(?=^###\s+NCT\d{8})/m).map((s) => s.trim()).filter(Boolean);
  if (!sections.length) return null;
  const summaries: TrialSummaryMarkdown[] = [];
  for (const section of sections) {
    const header = section.match(/^###\s+(NCT\d{8})/m);
    const nctId = header?.[1];
    if (nctId) {
      summaries.push({ nctId, markdown: section });
    }
  }
  if (!summaries.length) return null;
  const ordered: TrialSummaryMarkdown[] = [];
  for (const trial of expected) {
    const match = summaries.find((s) => s.nctId === trial.nctId);
    if (!match) return null;
    ordered.push(match);
  }
  return ordered;
}

export async function POST(req: Request) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ summaries: [], error: "Invalid JSON" }, { status: 400 });
  }

  const style = payload?.style === "plain" ? "plain" : "doctor-brief";
  const rawTrials = Array.isArray(payload?.trials) ? payload.trials : [];
  const trials = rawTrials
    .map((item: any) => coerceTrial(item))
    .filter((item: TrialFacts | null): item is TrialFacts => !!item)
    .slice(0, 5);

  if (!trials.length) {
    return NextResponse.json({ summaries: [] });
  }

  let notice: string | undefined;
  const validTrials = trials.filter((trial): trial is TrialFacts => !trial.error);
  const needGroq = style === "doctor-brief" && process.env.GROQ_API_KEY && validTrials.length > 0;
  let summaries: TrialSummaryMarkdown[] | null = null;

  if (needGroq) {
    try {
      const chunks = chunkTrials<TrialFacts>(validTrials, 2);
      const collected: TrialSummaryMarkdown[] = [];
      for (const chunk of chunks) {
        const system = "You are a medical summarizer. Only use provided JSON; do not invent facts; units and names must match source.";
        const content = JSON.stringify(chunk, null, 2);
        const messages: ChatCompletionMessageParam[] = [
          { role: "system", content: system },
          { role: "user", content },
        ];
        const response = await callGroq(messages, {
          temperature: 0,
          max_tokens: 900,
          metadata: { source: "trial-summary" },
        });
        const parsed = parseGroqMarkdown(response, chunk);
        if (!parsed) {
          throw new Error("Groq output malformed");
        }
        collected.push(...parsed);
      }
      const combined: TrialSummaryMarkdown[] = [];
      for (const trial of validTrials) {
        const match = collected.find((item) => item.nctId === trial.nctId);
        if (!match) {
          throw new Error("Missing Groq summary");
        }
        combined.push(match);
      }
      const merged: TrialSummaryMarkdown[] = [];
      for (const trial of trials) {
        if (trial.error) {
          merged.push({
            nctId: trial.nctId,
            markdown: `> ${trial.error}`,
          });
        } else {
          const summary = combined.find((item) => item.nctId === trial.nctId);
          merged.push(summary!);
        }
      }
      summaries = merged;
    } catch (err) {
      console.error("Groq trial summary fallback", err);
      notice = "Showing factual summary without TL;DR.";
    }
  }

  if (!summaries) {
    if (style === "doctor-brief" && !notice) {
      notice = "Showing factual summary without TL;DR.";
    }
    summaries = trials.map((trial) => ({
      nctId: trial.nctId,
      markdown: trial.error ? `> ${trial.error}` : formatPlainTrial(trial),
    }));
  }

  return NextResponse.json({ summaries, notice });
}
