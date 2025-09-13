// Symptom DB import: provides symptom-specific intake questions, self-care, and red-flag guidance.
// JSON file location: lib/aidoc/data/symptoms_master.json
// Example structure (showing three sample items per section):
// {
//   "fever": {
//     "questions": ["How many days?", "Highest temperature?", "Constant or intermittent?"],
//     "self_care": ["Hydrate", "Light clothing", "Monitor temperature"],
//     "red_flags": ["Stiff neck", "Confusion", "Shortness of breath"]
//   },
//   "cough": {
//     "questions": ["Duration?", "Dry or with sputum?", "Any blood in sputum?"],
//     "self_care": ["Warm fluids", "Avoid smoke and dust", "Rest voice if hoarse"],
//     "red_flags": ["Coughing blood", "Severe breathlessness", "High fever > 3 weeks"]
//   }
// }

import symptomsDB from "./data/symptoms_master.json";

export type Profile = {
  name?: string;
  age?: number;
  sex?: "M" | "F" | "Other";
  pregnant?: boolean | "Yes" | "No" | "Not sure";
};

export type TriageStage =
  | { stage: "demographics"; questions: string[] }
  | { stage: "intake"; questions: string[] }
  | { stage: "advice"; message: string; soap: any };

export function detectExperientialIntent(text: string): boolean {
  const t = (text || "").toLowerCase();
  return /\b(i have|i’m|im|fever|cough|pain|nausea|vomit|diarrhea|rash|shortness of breath)\b/i.test(t);
}

export function missingDemographics(p: Profile = {}): string[] {
  const q: string[] = [];
  if (!p.name) q.push("What is your name?");
  if (p.age == null) q.push("How old are you?");
  if (!p.sex) q.push("What is your gender (M/F/Other)?");
  if (p.sex === "F" && typeof p.age === "number" && p.age >= 12 && p.age <= 50 && p.pregnant == null) {
    q.push("Are you currently pregnant? (Yes/No/Not sure)");
  }
  return q;
}

function friendly(lines: string[]): string {
  const soften = (s: string) =>
    s
      .replace(/Provide details/gi, "Could you tell me a bit more?")
      .replace(/Any red flags/gi, "Just checking—any major warning signs?");
  return lines.map(soften).join("\n");
}

function buildSOAP({
  name, age, sex, chiefComplaint, answersSummary,
}: {
  name?: string; age?: number; sex?: string; chiefComplaint: string; answersSummary: string;
}) {
  return {
    subjective: `${name ? name + ", " : ""}${age ?? "?"}/${sex ?? "?"}\nCC: ${chiefComplaint}. HPI: ${answersSummary}`,
    objective: "Self-reported; no physical exam performed.",
    assessment: "Most consistent with a self-limited illness unless red flags are present.",
    plan: [
      "Self-care: fluids, rest, light meals; monitor symptoms.",
      "Safety: if any warning signs develop, seek urgent care.",
      "Follow-up: if not improving in 48–72 hours or worsening.",
    ],
  };
}

export async function handleDocAITriage({
  text,
  symptom,
  answers,
  profile,
}: {
  text: string;
  symptom?: string;
  answers?: Record<string, any> | null;
  profile?: Profile;
}): Promise<TriageStage> {
  const p = profile || {};

  // 1) Demographics first
  const missing = missingDemographics(p);
  if (missing.length) return { stage: "demographics", questions: missing };

  // 2) Intake questions from DB if available, else fallback
  const key = (symptom || text || "").toLowerCase().trim();
  const entry = (symptomsDB && (symptomsDB as any)[key]) || null;

  const intakeQs: string[] = entry?.questions ?? [
    "How long has this been going on?",
    "How severe is it (mild/moderate/severe)?",
    "Is it constant or does it come and go?",
    "Anything that makes it better or worse?",
    "Any other symptoms you’ve noticed?",
  ];

  if (!answers || Object.keys(answers).length === 0) {
    return { stage: "intake", questions: intakeQs.slice(0, 6) };
  }

  // 3) Advice + SOAP
  const pairs = Object.entries(answers).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`);
  const summary = pairs.join("; ");

  const tips: string[] = entry?.self_care ?? [
    "Rest as needed and stay hydrated.",
    "Keep the room comfortably cool; light clothing.",
    "Monitor symptoms; avoid strenuous activity.",
  ];
  const red: string[] = entry?.red_flags ?? [
    "Severe or rapidly worsening symptoms",
    "Chest pain, confusion, or difficulty breathing",
    "Persistent vomiting, dehydration, or bleeding",
  ];

  const msg = friendly([
    `Thanks—got it. Considering ${key || "your concern"}: ${summary}.`,
    "",
    "Basic steps to feel better (no medications unless you ask):",
    ...tips.map((t) => `• ${t}`),
    "",
    "If any of these occur, seek urgent care:",
    ...red.map((r) => `• ${r}`),
    "",
    "Any more symptoms you’d like to share?",
  ]);

  const soap = buildSOAP({
    name: p.name, age: p.age, sex: p.sex, chiefComplaint: key || "symptom", answersSummary: summary,
  });

  return { stage: "advice", message: msg, soap };
}
