import LLM, { createLLM } from "@/lib/llm";
import { validateUniversalCodingAnswer } from "@/lib/coding/validate";
import type {
  CodingCaseInput,
  UniversalCodingAnswer,
  UniversalCodingMode,
} from "@/types/coding";

const BASE_SYSTEM_PROMPT = `You are an expert medical coding advisor working on U.S. professional fee-for-service claims. Provide CPT/HCPCS, ICD-10-CM, modifier, and billing guidance that follows CMS, AMA, and NCCI rules. Respond only with valid structured JSON.`;

const BASE_INSTRUCTION = `Always fill the JSON fields: quickSummary (bullets that cover CPT/HCPCS, primary ICD-10 first, POS, global period, prior-auth yes/no), modifiers (list each modifier code and when it applies), ncciBundlingBullets (highlights about mutually exclusive edits or bundling rules), claimExample (dxCodes array limited to 4 entries and claimLines with CPT, modifiers array, Dx pointers referencing dxCodes positions, POS, units, and optional notes), and checklist (documentation reminders).
Keep codes uppercase. Use POS codes with two digits. Notes should be concise phrases.`;

const RESEARCH_EXTENSION = `When research depth is requested include rationale (narrative paragraph), payerNotes (bullet list of policy or medical-necessity caveats), icdSpecificity (bullet list describing ICD-10 detail requirements), and references (array of citation objects with title and optional URL).`; 

const BASE_JSON_SCHEMA = {
  name: "UniversalCodingAnswer",
  schema: {
    type: "object",
    properties: {
      quickSummary: { type: "array", items: { type: "string" }, minItems: 1 },
      modifiers: { type: "array", items: { type: "string" } },
      ncciBundlingBullets: { type: "array", items: { type: "string" } },
      checklist: { type: "array", items: { type: "string" }, minItems: 1 },
      claimExample: {
        type: "object",
        properties: {
          dxCodes: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
          claimLines: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                cpt: { type: "string" },
                description: { type: "string" },
                modifiers: { type: "array", items: { type: "string" } },
                dxPointers: { type: "array", items: { type: "string" }, minItems: 1 },
                pos: { type: "string" },
                units: { anyOf: [{ type: "string" }, { type: "number" }] },
                notes: { type: "string" },
              },
              required: ["cpt", "dxPointers", "pos", "units"],
            },
          },
          authBox23: { type: "string" },
        },
        required: ["dxCodes", "claimLines"],
      },
      rationale: { type: "string" },
      payerNotes: { type: "array", items: { type: "string" } },
      icdSpecificity: { type: "array", items: { type: "string" } },
      references: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            url: { type: "string" },
            note: { type: "string" },
          },
          required: ["title"],
        },
      },
    },
    required: ["quickSummary", "modifiers", "ncciBundlingBullets", "checklist", "claimExample"],
  },
};

function buildUserPrompt(input: CodingCaseInput, mode: UniversalCodingMode) {
  const blocks: string[] = [];
  blocks.push(`Clinical scenario: ${input.scenario.trim()}`);
  if (input.specialty) blocks.push(`Specialty focus: ${input.specialty.trim()}`);
  if (input.placeOfService) blocks.push(`Place of service: ${input.placeOfService.trim()}`);
  if (input.payer) blocks.push(`Payer context: ${input.payer.trim()}`);
  if (input.additionalNotes) blocks.push(`Additional notes: ${input.additionalNotes.trim()}`);
  blocks.push(`Mode: ${mode === "doctor" ? "Doctor (quick)" : "Doctor+Research (deep)"}`);
  blocks.push("Return JSON only. No markdown.");
  return blocks.join("\n\n");
}

export async function generateUniversalAnswer(
  input: CodingCaseInput,
  mode: UniversalCodingMode,
): Promise<UniversalCodingAnswer> {
  if (!input.scenario?.trim()) {
    throw new Error("A clinical scenario is required to generate coding guidance.");
  }

  const llm = createLLM();
  const messages = [
    { role: "system" as const, content: BASE_SYSTEM_PROMPT },
    {
      role: "system" as const,
      content: `${BASE_INSTRUCTION}${mode === "doctor+research" ? `\n${RESEARCH_EXTENSION}` : ""}`,
    },
    { role: "user" as const, content: buildUserPrompt(input, mode) },
  ];

  const response = await llm.chat({
    messages,
    temperature: mode === "doctor" ? 0.2 : 0.15,
    max_tokens: mode === "doctor" ? 1100 : 1600,
    response_format: { type: "json_schema", json_schema: BASE_JSON_SCHEMA },
  });

  const content = response?.content?.trim();
  if (!content) {
    throw new Error("The coding model returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error("Unable to parse coding response as JSON.");
  }

  const validated = validateUniversalCodingAnswer(parsed, mode);
  if (mode === "doctor" && validated.rationale === "") delete validated.rationale;
  return validated;
}

export default LLM;
