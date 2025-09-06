import { Mode, Intent } from "./contextManager";

export function buildPrompt(
  mainTopic: string,
  subtopics: string[],
  mode: Mode,
  intent: Intent,
  userQuery: string
) {
  const modeTemplates: Record<Mode, string> = {
    patient: "Explain simply for a non-medical audience.",
    doctor: "Provide detailed, clinically accurate information.",
    research: "Summarize latest studies with citations and dates.",
  };

  const intentTemplates: Record<Intent, string> = {
    overview: "Give a clear overview with key facts.",
    research: "List 3–5 studies with dates, sources, findings.",
    generate: "Create a structured, long-form response with headings and references.",
    resources: "List books, websites, or organizations for further learning.",
  };

  const hardGuards: Record<Intent, string> = {
    overview: "Do not include clinical trial listings or reference-style summaries.",
    research: "Do not provide general overviews; list recent studies/trials with dates and sources.",
    generate: "Produce long-form with sections; avoid bullet-only responses.",
    resources: "List curated resources; avoid clinical trial or long-form outputs.",
  };

  return `
Main Topic: ${mainTopic}
Subtopics: ${subtopics.join(", ")}
Mode: ${mode}
Intent: ${intent}

Guidelines:
${modeTemplates[mode]}
${intentTemplates[intent]}
${hardGuards[intent]}

User Query: ${userQuery}
`;
}
