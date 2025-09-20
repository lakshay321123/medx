export interface CaseCodingInput {
  specialty?: string;
  procedureName: string;
  side?: string;
  siteOfService: string;
  dxFreeText: string;
  dxCodes?: string[];
  payer?: string;
}

type CaseLike = Record<string, unknown> | null | undefined;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toCleanString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
}

function collectCandidates(source: CaseLike): Record<string, unknown>[] {
  if (!isPlainObject(source)) {
    return [];
  }

  const seen = new Set<CaseLike>();
  const queue: CaseLike[] = [source];
  const out: Record<string, unknown>[] = [];
  const NESTED_KEYS = ['case', 'caseContext', 'context', 'details', 'metadata', 'data'];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!isPlainObject(current) || seen.has(current)) continue;
    seen.add(current);
    out.push(current);

    for (const key of NESTED_KEYS) {
      const next = current[key];
      if (Array.isArray(next)) {
        for (const item of next) {
          if (isPlainObject(item)) {
            queue.push(item);
          }
        }
      } else if (isPlainObject(next)) {
        queue.push(next);
      }
    }
  }

  return out;
}

function pickFirstString(candidates: Record<string, unknown>[], keys: string[]): string | undefined {
  for (const candidate of candidates) {
    for (const key of keys) {
      if (!(key in candidate)) continue;
      const value = candidate[key];
      if (Array.isArray(value)) {
        const joined = value
          .map((item) => toCleanString(item))
          .filter((item): item is string => !!item)
          .join(', ');
        if (joined.length > 0) return joined;
      } else {
        const str = toCleanString(value);
        if (str) return str;
      }
    }
  }
  return undefined;
}

function collectStringArray(candidates: Record<string, unknown>[], keys: string[]): string[] {
  const out: string[] = [];

  for (const candidate of candidates) {
    for (const key of keys) {
      if (!(key in candidate)) continue;
      const value = candidate[key];

      if (typeof value === 'string') {
        value
          .split(/[,;\n]+/)
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((item) => out.push(item));
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string') {
            const trimmed = item.trim();
            if (trimmed) out.push(trimmed);
          } else if (isPlainObject(item)) {
            const maybe =
              toCleanString(item.code) ||
              toCleanString(item.icd) ||
              toCleanString(item.value) ||
              toCleanString(item.text) ||
              toCleanString(item.label);
            if (maybe) out.push(maybe);
          }
        }
      } else if (isPlainObject(value)) {
        const maybe =
          toCleanString(value.code) ||
          toCleanString(value.icd) ||
          toCleanString(value.value) ||
          toCleanString(value.text) ||
          toCleanString(value.label);
        if (maybe) out.push(maybe);
      }
    }
  }

  return Array.from(new Set(out));
}

function buildDxText(dxFreeText: string | undefined, dxCodes: string[]): string | undefined {
  if (dxFreeText && dxFreeText.trim().length > 0) {
    return dxFreeText.trim();
  }

  if (dxCodes.length > 0) {
    return dxCodes.join(', ');
  }

  return undefined;
}

const PROCEDURE_KEYS = [
  'procedureName',
  'procedure',
  'primaryProcedure',
  'procedureTitle',
  'procedureSummary',
  'procedure_details',
  'procedureDetails',
  'operation',
  'cptDescription',
];

const POS_KEYS = ['siteOfService', 'placeOfService', 'pos', 'site', 'location', 'facility', 'site_of_service'];
const SPECIALTY_KEYS = ['specialty', 'providerSpecialty', 'department', 'serviceLine'];
const SIDE_KEYS = ['side', 'laterality', 'lateralityLabel'];
const DX_TEXT_KEYS = ['dxFreeText', 'diagnosis', 'diagnosesText', 'dx', 'indication', 'reason', 'reasonForVisit'];
const PAYER_KEYS = ['payer', 'insurance', 'payerName', 'plan'];
const DX_CODE_KEYS = ['dxCodes', 'diagnosisCodes', 'icdCodes', 'icd10Codes', 'dx_code', 'icd_code', 'codes'];

export function collectCaseInput(caseContext: CaseLike): CaseCodingInput | null {
  const candidates = collectCandidates(caseContext);
  if (candidates.length === 0) {
    return null;
  }

  const procedureName = pickFirstString(candidates, PROCEDURE_KEYS);
  const siteOfService = pickFirstString(candidates, POS_KEYS);
  const specialty = pickFirstString(candidates, SPECIALTY_KEYS);
  const side = pickFirstString(candidates, SIDE_KEYS);
  const payer = pickFirstString(candidates, PAYER_KEYS);
  const rawDxText = pickFirstString(candidates, DX_TEXT_KEYS);
  const dxCodes = collectStringArray(candidates, DX_CODE_KEYS);
  const dxFreeText = buildDxText(rawDxText, dxCodes);

  if (!procedureName || !siteOfService || !dxFreeText) {
    return null;
  }

  const result: CaseCodingInput = {
    procedureName,
    siteOfService,
    dxFreeText,
  };

  if (specialty) {
    result.specialty = specialty;
  }

  if (side) {
    result.side = side;
  }

  if (payer) {
    result.payer = payer;
  }

  if (dxCodes.length > 0) {
    result.dxCodes = dxCodes;
  }

  return result;
}
