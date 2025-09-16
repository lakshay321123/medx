import { BRAND_NAME } from "@/lib/brand";
import { buildContextBundle } from "./contextBuilder";

export async function systemPrompt(thread_id?: string) {
  const bundle = await buildContextBundle(thread_id);
  const memoryLines = (bundle.memories ?? [])
    .map(m => `- ${m.key}: ${JSON.stringify(m.value)}`).join("\n");

  return `
You are ${BRAND_NAME}. Use the user’s memory if helpful, but never invent facts.

Memory context:
${memoryLines || "- none"}
`;
}
