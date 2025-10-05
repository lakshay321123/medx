import { isValidMode } from '@/lib/formats/constants';

export function normalizeModeTag(raw: unknown): string {
  const value = String(raw ?? '').trim().toLowerCase().replace(/\s+/g, '_');

  if (isValidMode(value)) return value;
  if (value === 'doctor' || value === 'clinician') return 'clinical';
  if (value === 'patient') return 'wellness';

  return value;
}
