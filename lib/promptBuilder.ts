import { Intent, Mode } from "./contextManager";

export function buildPrompt(mainTopic: string, subtopics: string[], mode: Mode, intent: Intent, userQuery: string) {
  const modeTemplates: Record<Mode, string> = {
    patient: "Explain simply and clearly for a non-medical audience.",
    doctor: "Provide detailed, clinically accurate information with medical terminology.",
    research: "Summarize latest studies, clinical trials, and include citations if available."
  };

  const intentTemplates: Record<Intent, string> = {
    overview: "Give a concise, accurate overview.",
    research: "Summarize key studies, include dates, sources, citations.",
    generate: "Create a structured, long-form response with sections and references.",
    resources: "List books, websites, or organizations related to the topic."
  };

  return `
Main Topic: ${mainTopic}
Subtopics: ${subtopics.join(", ")}
Mode: ${mode}
Intent: ${intent}

Guidelines:
${modeTemplates[mode]}
${intentTemplates[intent]}

User Query: ${userQuery}
  `;
}
