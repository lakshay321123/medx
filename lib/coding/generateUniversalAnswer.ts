import type { CodingMode, UniversalCodingAnswer } from "@/types/coding";

const SYSTEM = `You are a U.S. medical coding assistant for PROFESSIONAL claims.
Return ONLY valid JSON per schema. 
Doctor = concise CPT/ICD/claim output. 
Doctor+Research = adds rationale, payer notes, ICD-10 specificity, references. 
Follow CMS/NCCI rules. No free text outside JSON.`;

function buildPrompt(input: Record<string, any>, mode: CodingMode) {
  return `
CASE INPUT:
${JSON.stringify(input, null, 2)}

MODE: ${mode}

OUTPUT:
- quickSummary: CPT/HCPCS, ICD-10-CM (principal first), POS (21/22/24), Global period, Auth (Y/N)
- modifiers: only relevant, with use cases
- ncciBundlingBullets: 3–6 bullets
- claimExample: dxCodes ≤4, claimLines CPT+modifiers+dxPointers+POS+units+notes(Box19)
- checklist: 5–8 bullets

Doctor+Research ALSO:
- rationale (4–8 sentences)
- payerNotes (2–6 bullets)
- icdSpecificity (2–6 bullets)
- references (CMS/NCCI/NUCC links)

If details missing → pick most typical and note in rationale.
JSON only.`;
}

export async function generateUniversalAnswer(
  input: Record<string, any>,
  mode: CodingMode,
): Promise<UniversalCodingAnswer> {
  if (typeof window !== "undefined") {
    const res = await fetch("/api/tools/coding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, mode }),
    });
    if (!res.ok) {
      const message = await res.text().catch(() => "Unable to generate coding guidance.");
      throw new Error(message || "Unable to generate coding guidance.");
    }
    return (await res.json()) as UniversalCodingAnswer;
  }

  const { callLLM } = await import("@/lib/llm");
  const json = await callLLM({
    system: SYSTEM,
    prompt: buildPrompt(input, mode),
    response_format: { type: "json_object" },
    temperature: 0.1,
  });
  return JSON.parse(json) as UniversalCodingAnswer;
}
