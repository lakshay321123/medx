import { CodingMode, UniversalCodingAnswer } from '@/types/coding';
import { callLLM } from '@/lib/llm';

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

function normalizeAnswer(raw: UniversalCodingAnswer, mode: CodingMode): UniversalCodingAnswer {
  const quickSummary = Array.isArray(raw.quickSummary) ? raw.quickSummary : [];
  const modifiers = Array.isArray(raw.modifiers) ? raw.modifiers : [];
  const ncciBundlingBullets = Array.isArray(raw.ncciBundlingBullets) ? raw.ncciBundlingBullets : [];
  const checklist = Array.isArray(raw.checklist) ? raw.checklist : [];
  const payerNotes = raw.payerNotes?.filter(Boolean);
  const icdSpecificity = raw.icdSpecificity?.filter(Boolean);
  const references = raw.references?.filter((ref) => ref && ref.label);
  const claim = raw.claimExample || { dxCodes: [], claimLines: [] };
  const dxCodes = Array.isArray(claim.dxCodes) ? claim.dxCodes.slice(0, 4) : [];
  const claimLines = Array.isArray(claim.claimLines)
    ? claim.claimLines.map((line) => ({
        cpt: typeof line.cpt === 'string' ? line.cpt : '',
        modifiers: Array.isArray(line.modifiers) ? line.modifiers : [],
        dxPointers: Array.isArray(line.dxPointers) ? line.dxPointers : [],
        units: typeof line.units === 'number' ? line.units : 1,
        pos: line.pos || '',
        notes: line.notes || '',
        charge:
          typeof line.charge === 'number'
            ? line.charge
            : line.charge === null
            ? null
            : undefined,
      }))
    : [];

  return {
    mode,
    quickSummary,
    modifiers,
    ncciBundlingBullets,
    claimExample: {
      dxCodes,
      claimLines,
      authBox23: claim.authBox23 ?? null,
    },
    checklist,
    rationale: raw.rationale,
    payerNotes: payerNotes && payerNotes.length ? payerNotes : undefined,
    icdSpecificity: icdSpecificity && icdSpecificity.length ? icdSpecificity : undefined,
    references: references && references.length ? references : undefined,
  };
}

export async function generateUniversalAnswerServer(
  input: Record<string, any>,
  mode: CodingMode
): Promise<UniversalCodingAnswer> {
  const prompt = buildPrompt(input, mode);
  const response = await callLLM({
    system: SYSTEM,
    prompt,
    temperature: 0.1,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
  });

  let parsed: UniversalCodingAnswer;
  try {
    parsed = JSON.parse(response);
  } catch (error) {
    throw new Error('LLM returned invalid JSON');
  }

  return normalizeAnswer(parsed, mode);
}

export async function generateUniversalAnswer(
  input: Record<string, any>,
  mode: CodingMode
): Promise<UniversalCodingAnswer> {
  if (typeof window === 'undefined') {
    return generateUniversalAnswerServer(input, mode);
  }

  const res = await fetch('/api/tools/coding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, mode }),
  });

  if (!res.ok) {
    throw new Error('Unable to generate coding guidance');
  }

  const json = (await res.json()) as UniversalCodingAnswer;
  return normalizeAnswer(json, mode);
}
