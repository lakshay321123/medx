import type { Plan, HealthTopicSlice } from "./answerPlanner";

const SLICE_ORDER: Record<HealthTopicSlice, string> = {
  definition: "## **What it is**",
  types: "## **Types**",
  symptoms: "## **Symptoms**",
  causes: "## **Common Causes**",
  home_care: "## **Home Care**",
  treatment: "## **Treatment Options**",
  prevention: "## **Prevention**",
  red_flags: "## **Red Flags**",
  when_to_seek_help: "## **When to Seek Help**",
  faq: "## **FAQs**",
  references: "## **References**",
};

export function buildHealthPrompt(plan: Plan, userQuestion: string) {
  const sections = plan.slices.map(s => SLICE_ORDER[s]).join("\n\n");
  const bulletsHint =
`- Use bold headers and short bullet points.
- Keep it under ${plan.wordCap} words total.
- Avoid repetition.`;

  const followupHint =
`End with a single line asking if the user wants more, e.g.:
*Would you like details on symptoms, causes, home care, prevention, or when to seek help?*`;

  return `
You are a clinical explainer for laypeople. Be accurate, neutral, and concise.

User question: "${userQuestion}"
Topic: ${plan.topic}
Detail level: ${plan.detail}

Write ONLY the sections requested, in this order:
${sections}

Formatting:
${bulletsHint}

${followupHint}
`.trim();
}
