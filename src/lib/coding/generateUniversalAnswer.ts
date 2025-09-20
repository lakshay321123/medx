import { createLLM } from '@/lib/llm';
import type { UniversalCodingAnswer, UniversalCodingClaimLine } from '@/types/coding';

export interface UniversalCodingInput {
  clinicalContext: string;
  specialty?: string;
  suspectedDiagnosis?: string;
  procedureDetails?: string;
  payer?: string;
  placeOfService?: string;
  additionalNotes?: string;
}

export type UniversalCodingMode = UniversalCodingAnswer['mode'];

const llm = createLLM();

function formatInputDetails(input: UniversalCodingInput): string {
  const details: string[] = [`Clinical context: ${input.clinicalContext}`];

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
  const commonSections =
    'Return a JSON object with these fields:\n' +
    `- mode: the exact string "${mode}".\n` +
    '- quickSummary: array of objects with { "label", "value" } and include rows for CPT/HCPCS, ICD-10-CM (principal first), POS (21/22/24), Global period, Authorization (Y/N).\n' +
    '- modifiers: array of objects { "modifier", "useCase" } describing modifier intent (use empty array if not needed).\n' +
    '- ncciBundlingBullets: array of concise bullet strings about common NCCI or payer edits.\n' +
    '- claimExample: object with { "dxCodes" (max 4 ICD-10-CM codes ordered for Box 21), "claimLines" (array), optional "authBox23" }. Each claim line should include { "cpt", optional "modifiers" array, optional numeric "dxPointers" array (use 1-4 to map to Box 21 order), optional "pos", optional numeric "units", optional "notes", optional numeric "charge" }.\n' +
    '- checklist: array of denial-prevention bullet strings.';

  const doctorOnly = 'Do not include rationale, payerNotes, icdSpecificity, or references.';

  const researchExtras =
    'Also include:\n' +
    '- rationale: succinct prose explaining coding selection and any assumptions.\n' +
    '- payerNotes: array of payer-specific considerations (authorization, bilateral rules, assistant surgery coverage, etc.).\n' +
    '- icdSpecificity: array of ICD-10 specificity reminders (laterality, extensions, combination coding, 7th characters).\n' +
    '- references: array of objects { "label", optional "url" } citing authoritative guidance (CMS, NCCI, specialty guidelines). If any information is missing, pick the typical option and state the assumption within rationale.';

  const instructions = [
    'You are an expert professional fee medical coding assistant.',
    'Provide coder-ready recommendations for the scenario below.',
    'Respond with valid JSON only. Do not include Markdown fences or commentary.',
    'Each string should be concise and plain text without bullet prefixes unless explicitly asked.',
    'Ensure claim lines align with the ICD-10 codes in Box 21 and reflect realistic CMS-1500/837P billing.'
  ];

  const sectionGuidance = mode === 'doctor' ? `${commonSections}\n${doctorOnly}` : `${commonSections}\n${researchExtras}`;

  const caseDetails = formatInputDetails(input);

  return `${instructions.join(' ')}\n\n${sectionGuidance}\n\nCase details:\n${caseDetails}`;
}

function cleanJsonContent(content: string): any {
  const trimmed = content.trim();
  const withoutFence = trimmed.replace(/^```json\s*/i, '').replace(/^```/i, '').replace(/```$/i, '');
  return JSON.parse(withoutFence || trimmed);
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter((item) => item.length > 0);
}

function ensureNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const num = typeof item === 'number' ? item : Number(item);
      return Number.isFinite(num) ? num : null;
    })
    .filter((item): item is number => item !== null);
}

function normalizeClaimLines(lines: unknown): UniversalCodingClaimLine[] {
  if (!Array.isArray(lines)) return [];

  const normalized: UniversalCodingClaimLine[] = [];

  for (const line of lines) {
    if (!line || typeof line !== 'object') continue;

    const record = line as Record<string, unknown>;
    const cptValue = record.cpt;
    if (cptValue === undefined || cptValue === null) continue;

    const rawUnits = record.units;
    let units: number | undefined;
    if (typeof rawUnits === 'number' && Number.isFinite(rawUnits)) {
      units = rawUnits;
    } else if (typeof rawUnits === 'string') {
      const trimmed = rawUnits.trim();
      if (trimmed.length > 0) {
        const parsed = Number(trimmed);
        if (Number.isFinite(parsed)) {
          units = parsed;
        }
      }
    }

    const rawCharge = record.charge;
    let charge: number | null | undefined;
    if (typeof rawCharge === 'number' && Number.isFinite(rawCharge)) {
      charge = rawCharge;
    } else if (rawCharge === null) {
      charge = null;
    }

    const modifiers = ensureStringArray(record.modifiers);
    const dxPointers = ensureNumberArray(record.dxPointers);

    const claimLine: UniversalCodingClaimLine = {
      cpt: String(cptValue)
    };

    if (modifiers.length > 0) {
      claimLine.modifiers = modifiers;
    }

    if (dxPointers.length > 0) {
      claimLine.dxPointers = dxPointers;
    }

    if (typeof units === 'number') {
      claimLine.units = units;
    }

    if (typeof record.pos === 'string') {
      claimLine.pos = record.pos;
    }

    if (typeof record.notes === 'string') {
      claimLine.notes = record.notes;
    }

    if (charge !== undefined) {
      claimLine.charge = charge;
    }

    normalized.push(claimLine);
  }

  return normalized;
}

function normalizeAnswer(raw: any, mode: UniversalCodingMode): UniversalCodingAnswer {
  const quickSummary = Array.isArray(raw?.quickSummary)
    ? raw.quickSummary
        .map((item: any) => ({ label: String(item?.label ?? ''), value: String(item?.value ?? '') }))
        .filter((item: { label: string; value: string }) => item.label.length > 0 && item.value.length > 0)
    : [];

  const modifiers = Array.isArray(raw?.modifiers)
    ? raw.modifiers
        .map((item: any) => ({ modifier: String(item?.modifier ?? ''), useCase: String(item?.useCase ?? '') }))
        .filter((item: { modifier: string; useCase: string }) => item.modifier.length > 0 && item.useCase.length > 0)
    : [];

  const claimExampleRaw = raw?.claimExample ?? {};

  const claimExample = {
    dxCodes: ensureStringArray(claimExampleRaw.dxCodes).slice(0, 4),
    claimLines: normalizeClaimLines(claimExampleRaw.claimLines),
    authBox23:
      typeof claimExampleRaw.authBox23 === 'string'
        ? claimExampleRaw.authBox23
        : claimExampleRaw.authBox23 === null
        ? null
        : undefined
  };

  const baseAnswer: UniversalCodingAnswer = {
    mode,
    quickSummary,
    modifiers,
    ncciBundlingBullets: ensureStringArray(raw?.ncciBundlingBullets),
    claimExample,
    checklist: ensureStringArray(raw?.checklist)
  };

  if (mode === 'doctor') {
    return baseAnswer;
  }

  return {
    ...baseAnswer,
    rationale: typeof raw?.rationale === 'string' ? raw.rationale : undefined,
    payerNotes: ensureStringArray(raw?.payerNotes),
    icdSpecificity: ensureStringArray(raw?.icdSpecificity),
    references: Array.isArray(raw?.references)
      ? raw.references
          .map((item: any) => {
            const label = String(item?.label ?? '');
            if (!label) return null;
            return {
              label,
              url: typeof item?.url === 'string' && item.url.length > 0 ? item.url : undefined
            };
          })
          .filter((item: { label: string } | null): item is { label: string; url?: string } => item !== null)
      : []
  };
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

  return normalizeAnswer(raw, mode);
}
