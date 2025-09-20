import { createLLM } from '@/lib/llm';
import type {
  UniversalCodingAnswer,
  UniversalCodingInput,
  UniversalCodingMode,
  UniversalCodingDoctorResearchAnswer,
  UniversalCodingDoctorAnswer,
  UniversalCodingClaimExample,
  UniversalCodingClaimLine,
  UniversalCodingQuickSummaryItem,
  UniversalCodingModifierItem,
  UniversalCodingReference
} from '@/types/coding';

const llm = createLLM();

function formatInputDetails(input: UniversalCodingInput): string {
  const details: string[] = [
    `Clinical context: ${input.clinicalContext}`
  ];

  if (input.specialty) {
    details.push(`Specialty: ${input.specialty}`);
  }

  if (input.suspectedDiagnosis) {
    details.push(`Suspected diagnosis: ${input.suspectedDiagnosis}`);
  }

  if (input.procedureDetails) {
    details.push(`Procedure details: ${input.procedureDetails}`);
  }

  if (input.payer) {
    details.push(`Payer: ${input.payer}`);
  }

  if (input.placeOfService) {
    details.push(`Place of service: ${input.placeOfService}`);
  }

  if (input.additionalNotes) {
    details.push(`Additional notes: ${input.additionalNotes}`);
  }

  return details.map((detail) => `- ${detail}`).join('\n');
}

function buildPrompt(input: UniversalCodingInput, mode: UniversalCodingMode): string {
  const commonSections = `Return a JSON object with these fields:\n` +
    `- mode: the exact string "${mode}".\n` +
    `- quickSummary: array of objects with { "label", "value", optional "notes" }. Include the following rows in order: CPT/HCPCS, ICD-10-CM (principal first), POS (21/22/24), Global period, Authorization (Y/N).\n` +
    `- modifiers: array of objects { "modifier", "useCase" } describing modifier intent or leave empty array when none apply.\n` +
    `- ncciBundlingBullets: array of concise bullet strings highlighting frequent NCCI edits for this scenario.\n` +
    `- claimExample: object with { "dxCodes" (max 4 ICD-10-CM codes ordered for Box 21), "claimLines" (array) and optional "authBox23" }. Each claim line requires { "cpt", optional "modifiers" array, "dxPointers" (e.g. ["A", "B"] mapping to Box 21 order), "pos", "units", optional "notes", optional numeric "charge" }.\n` +
    `- checklist: array of denial-prevention bullet strings.`;

  const doctorOnly = `Do not include rationale, payerNotes, icdSpecificity, or references.`;

  const researchExtras = `Also include:\n` +
    `- rationale: succinct prose explaining code choice and assumptions.\n` +
    `- payerNotes: array of payer-specific considerations (authorization, bilateral rules, assistant surgery coverage, etc.).\n` +
    `- icdSpecificity: array describing ICD-10 specificity reminders (laterality, 7th characters, combination codes).\n` +
    `- references: array of objects { "label", "url" } citing authoritative sources (CMS, NCCI, specialty guidelines). If any scenario detail is missing, choose the most typical option and call out that assumption inside rationale.`;

  const instructions = [
    'You are an expert professional fee medical coding assistant.',
    'Provide coder-ready recommendations for the scenario below.',
    'Respond with valid JSON only. Do not include Markdown fences or commentary.',
    'Each string should be concise and plain text without bullet prefixes unless explicitly asked.',
    'Ensure claim lines align with the ICD-10 codes in Box 21 and reflect realistic CMS-1500/837P billing.'
  ];

  const sectionGuidance = mode === 'doctor'
    ? `${commonSections}\n${doctorOnly}`
    : `${commonSections}\n${researchExtras}`;

  const caseDetails = formatInputDetails(input);

  return `${instructions.join(' ')}\n\n${sectionGuidance}\n\nCase details:\n${caseDetails}`;
}

function cleanJsonContent(content: string): any {
  const trimmed = content.trim();
  const withoutFence = trimmed.replace(/^```json\s*/i, '').replace(/^```/i, '').replace(/```$/i, '');
  return JSON.parse(withoutFence || trimmed);
}

function ensureArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeClaimLines(lines: UniversalCodingClaimLine[] | undefined): UniversalCodingClaimLine[] {
  if (!Array.isArray(lines)) return [];
  return lines.map((line) => ({
    cpt: line.cpt,
    modifiers: ensureArray(line.modifiers ?? undefined),
    dxPointers: ensureArray(line.dxPointers),
    pos: line.pos,
    units: line.units,
    notes: line.notes,
    charge: line.charge
  }));
}

function normalizeClaimExample(claimExample: Partial<UniversalCodingClaimExample> | undefined): UniversalCodingClaimExample {
  return {
    dxCodes: ensureArray<string>(claimExample?.dxCodes as string[] | undefined).slice(0, 4),
    claimLines: normalizeClaimLines(claimExample?.claimLines as UniversalCodingClaimLine[] | undefined),
    authBox23: claimExample?.authBox23
  };
}

function normalizeQuickSummary(items: UniversalCodingQuickSummaryItem[] | undefined): UniversalCodingQuickSummaryItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    label: item.label,
    value: item.value,
    notes: item.notes
  }));
}

function normalizeModifiers(items: UniversalCodingModifierItem[] | undefined): UniversalCodingModifierItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    modifier: item.modifier,
    useCase: item.useCase
  }));
}

export async function generateUniversalAnswer(
  input: UniversalCodingInput,
  mode: UniversalCodingMode
): Promise<UniversalCodingAnswer> {
  const prompt = buildPrompt(input, mode);

  const { content } = await llm.chat({
    messages: [
      { role: 'system', content: 'You follow CPT, CMS, and NCCI rules with meticulous accuracy.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' }
  });

  const raw = cleanJsonContent(content);

  const baseAnswer = {
    mode,
    quickSummary: normalizeQuickSummary(raw.quickSummary as UniversalCodingQuickSummaryItem[] | undefined),
    modifiers: normalizeModifiers(raw.modifiers as UniversalCodingModifierItem[] | undefined),
    ncciBundlingBullets: ensureArray<string>(raw.ncciBundlingBullets as string[] | undefined),
    claimExample: normalizeClaimExample(raw.claimExample as UniversalCodingClaimExample | undefined),
    checklist: ensureArray<string>(raw.checklist as string[] | undefined)
  };

  if (mode === 'doctor') {
    const doctorAnswer: UniversalCodingDoctorAnswer = {
      ...baseAnswer,
      mode: 'doctor'
    };
    return doctorAnswer;
  }

  const researchAnswer: UniversalCodingDoctorResearchAnswer = {
    ...baseAnswer,
    mode: 'doctor_research',
    rationale: raw.rationale || '',
    payerNotes: ensureArray<string>(raw.payerNotes as string[] | undefined),
    icdSpecificity: ensureArray<string>(raw.icdSpecificity as string[] | undefined),
    references: ensureArray<UniversalCodingReference>(raw.references as UniversalCodingReference[] | undefined)
  };

  return researchAnswer;
}
