export interface MedicationSummaryInput {
  use: string; // what it's for
  common: string[]; // common side effects or cautions
  serious: string[]; // serious side effects
  notes?: string; // optional use notes
  references?: { name: string; url: string }[]; // references
  pediatric?: string; // pediatric caution
  elderly?: string; // elderly caution
  complexSafety?: boolean; // if safety profile complex
}

export interface MedicationSummaryOutput {
  summary: string; // micro summary lines joined by \n
  serious: string; // serious side-effects line
  references: { name: string; url: string }[];
  disclaimer: string;
}

export const MEDS_SHORT_SUMMARY_ENABLED = process.env.MEDS_SHORT_SUMMARY === 'true';

const DISCLAIMER = "Not medical advice; confirm with a clinician.";

export function buildMedicationShortSummary(info: MedicationSummaryInput, maxChars = parseInt(process.env.MEDS_SHORT_SUMMARY_MAX_CHARS || '320')): MedicationSummaryOutput {
  const lines: string[] = [];

  const line1 = info.use.trim();
  if (line1) lines.push(line1);

  const cautions = [...(info.common || [])];
  if (info.pediatric) cautions.push(info.pediatric);
  if (info.elderly) cautions.push(info.elderly);
  const line2 = cautions.join(', ');
  if (line2) lines.push(line2);

  if (info.notes) lines.push(info.notes.trim());

  if (info.complexSafety && lines.length) {
    const last = lines[lines.length - 1];
    const suffix = last.endsWith('…') ? '' : '…';
    lines[lines.length - 1] = `${last}${suffix} see full details`;
  }

  let summary = lines.slice(0, 3).join('\n');
  if (summary.length > maxChars) {
    summary = summary.slice(0, maxChars).trim();
  }

  const serious = `Serious side-effects (seek care if…): ${info.serious.join(', ')}`;

  return {
    summary,
    serious,
    references: (info.references || []).slice(0, 2),
    disclaimer: DISCLAIMER,
  };
}
