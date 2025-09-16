import { callGroq } from "@/lib/llm/groq";
import type { SummaryBundle, SummarizerInput } from "./types";

const DEFAULT_SUMMARIZER_MODEL = process.env.GROQ_DEFAULT_MODEL || "groq@summary_v1";

function computeAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (!Number.isFinite(+birth)) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export async function generateSummaries(input: SummarizerInput): Promise<{
  bundle?: SummaryBundle;
  error?: string;
}> {
  if (!process.env.GROQ_API_KEY) {
    return { error: "groq-missing" };
  }

  const payload = {
    patient: {
      id: input.patient.id,
      age: computeAge(input.patient.dob),
      sex: input.patient.sex,
    },
    generatedAt: input.features.generatedAt,
    domains: input.domains.map(domain => ({
      condition: domain.condition,
      riskScore: Number((domain.riskScore * 100).toFixed(1)),
      riskLabel: domain.riskLabel,
      topFactors: domain.topFactors,
      metrics: domain.features.metrics ?? {},
    })),
    noteTags: input.features.noteFlags.tags,
  };

  const messages = [
    {
      role: "system" as const,
      content:
        "You are a clinical documentation assistant. Summarize provided risk results without inventing information. Return JSON with fields patient_summary_md and clinician_summary_md. Each summary must stay within the word limits (<=150 words for patient, <=180 words for clinician). Echo numeric values exactly as provided. If anything is unclear use the literal string 'UNSURE'. Do not recommend emergency actions. Use friendly reassurance for the patient summary and guideline-aligned phrasing for the clinician summary.",
    },
    {
      role: "user" as const,
      content: JSON.stringify(payload, null, 2),
    },
  ];

  let text: string;
  try {
    text = await callGroq(messages, {
      temperature: 0,
      max_tokens: 600,
      metadata: { task: "aidoc_longitudinal_risk_summary" },
    });
  } catch (err: any) {
    return { error: err?.message || "groq-failed" };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { error: "groq-invalid-json" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { error: "groq-invalid-shape" };
  }

  const patientSummary = typeof parsed.patient_summary_md === "string" ? parsed.patient_summary_md.trim() : null;
  const clinicianSummary = typeof parsed.clinician_summary_md === "string" ? parsed.clinician_summary_md.trim() : null;
  if (!patientSummary || !clinicianSummary) {
    return { error: "groq-missing-fields" };
  }

  return {
    bundle: {
      patient_summary_md: patientSummary,
      clinician_summary_md: clinicianSummary,
      summarizer_model: DEFAULT_SUMMARIZER_MODEL,
    },
  };
}
