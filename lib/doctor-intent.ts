// lib/doctor-intent.ts
export type DoctorIntent = 'overview' | 'codes' | 'trials' | 'guidelines';

export function classifyDoctorIntent(input: string): DoctorIntent {
  const q = input.toLowerCase();
  if (/\b(trial|nct|phase\s*[1-4]|clinical\s*trial)\b/.test(q)) return 'trials';
  if (/\b(icd|icd-10|icd-11|snomed|code|coding)\b/.test(q)) return 'codes';
  if (/\b(guideline|who|nice|nih|consensus)\b/.test(q)) return 'guidelines';
  return 'overview';
}
