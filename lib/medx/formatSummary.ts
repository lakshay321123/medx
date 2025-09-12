export type DoctorSummaryInput = {
  acuity: 'Critical' | 'High' | 'Moderate';
  news2?: number | null;
  qsofa?: number | null;
  keyAbnormalities: string[];
  impression: string;
  immediateSteps: string[];
  mdm: string[]; // reasoning lines (≤3)
  recommendedTests: string[];
  disposition: string;
  expanded?: boolean;
};

export type PatientSummaryInput = {
  summary: string;
  whyItMatters: string;
  whatToDoNow: string[];
  furtherTests: string[];
  whatToExpect: string;
  safetyNet: string;
  expanded?: boolean;
};

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ');
}

function countTokens(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function enforceTokenLimit(lines: string[], limit: number): string[] {
  while (countTokens(lines.join(' ')) > limit && lines.length > 0) {
    lines.pop();
  }
  return lines;
}

function formatDoctorSummary(input: DoctorSummaryInput, tokenLimit: number): string {
  const lines: string[] = [];
  const news2 = input.news2 ?? '—';
  const qsofa = input.qsofa ?? '—';
  lines.push(`Acuity: ${input.acuity} | NEWS2 ${news2} | qSOFA ${qsofa}`);
  if (input.keyAbnormalities?.length) {
    lines.push(`Key abnormalities: ${truncateWords(input.keyAbnormalities.join('; '), 12)}`);
  }
  lines.push(`Impression: ${truncateWords(input.impression, 12)}`);
  if (input.immediateSteps?.length) {
    lines.push(`Immediate steps: ${truncateWords(input.immediateSteps.join('; '), 12)}`);
  }
  if (input.mdm?.length) {
    input.mdm.slice(0, 3).forEach(m => {
      lines.push(`MDM: ${truncateWords(m, 12)}`);
    });
  }
  if (input.recommendedTests?.length) {
    lines.push(`Recommended tests: ${truncateWords(input.recommendedTests.join('; '), 12)}`);
  }
  lines.push(`Disposition: ${truncateWords(input.disposition, 12)}`);

  const limited = enforceTokenLimit(lines.slice(0, 12).map(l => truncateWords(l, 12)), tokenLimit);
  return limited.join('\n');
}

function formatPatientSummary(input: PatientSummaryInput, tokenLimit: number): string {
  const bullets: string[] = [];
  bullets.push(`• ${truncateWords(input.summary, 18)}`);
  bullets.push(`• Why this matters: ${truncateWords(input.whyItMatters, 18)}`);
  bullets.push(`• What to do now: ${truncateWords(input.whatToDoNow.join('; '), 18)}`);
  if (input.furtherTests?.length) {
    bullets.push(`• Further tests: ${truncateWords(input.furtherTests.join('; '), 18)}`);
  }
  bullets.push(`• What to expect: ${truncateWords(input.whatToExpect, 18)}`);
  bullets.push(`• Safety net: ${truncateWords(input.safetyNet, 18)}`);

  const limited = enforceTokenLimit(bullets.slice(0, 6).map(b => truncateWords(b, 18)), tokenLimit);
  return limited.join('\n');
}

/**
 * Format structured summary per MEDX_FORMAT_V1.
 * @param mode provided mode string (doctor, doc ai, patient). doctor wins if combined.
 */
export function formatMedxSummary(mode: string, input: DoctorSummaryInput | PatientSummaryInput): string {
  const raw = (mode || '').toLowerCase();
  const expanded = (input as any).expanded || raw.includes('expanded');
  const tokenLimit = expanded ? 350 : 220;
  const isDoctor = raw.includes('doctor');
  const effMode = isDoctor ? 'doctor' : 'patient';
  return effMode === 'doctor'
    ? formatDoctorSummary(input as DoctorSummaryInput, tokenLimit)
    : formatPatientSummary(input as PatientSummaryInput, tokenLimit);
}

export default formatMedxSummary;
