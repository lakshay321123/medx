// lib/intent.ts
export type NearbyKind = 'doctor' | 'clinic' | 'hospital' | 'pharmacy' | 'any';
export type NearbyIntent =
  | { type: 'nearby'; kind: NearbyKind; specialty?: string }
  | { type: 'none' };

const SPECIALTY_MAP: Record<string, string> = {
  // gynecology/OBGYN spellings & synonyms
  'gyn': 'gynecology',
  'gyne': 'gynecology',
  'gynae': 'gynecology',
  'gynaecologist': 'gynecology',
  'gynecologist': 'gynecology',
  'gynacologist': 'gynecology', // common misspelling
  'obgyn': 'gynecology',
  'ob-gyn': 'gynecology',
  'ob/gyn': 'gynecology',
  'obstetrician': 'gynecology',
  'obstetrics': 'gynecology',
  // add more common specialties here as you expand:
  'cardiologist': 'cardiology',
  'dermatologist': 'dermatology',
  'dentist': 'dentistry',
  'urologist': 'urology',
  'neurologist': 'neurology',
  'orthopedic': 'orthopedics',
};

export function parseNearbyIntent(q: string): NearbyIntent {
  const s = (q || '').toLowerCase();
  const nearMe = /\b(near me|nearby|around me|closest|in my area)\b/.test(s);
  if (!nearMe) return { type: 'none' };

  let kind: NearbyKind = 'any';
  if (/\b(pharmacy|chemist|drug ?store)\b/.test(s)) kind = 'pharmacy';
  else if (/\b(hospital|er|emergency)\b/.test(s)) kind = 'hospital';
  else if (/\b(clinic|urgent care|polyclinic)\b/.test(s)) kind = 'clinic';
  else if (/\b(doctor|doctors|physician|gp|dentist|dermatologist|cardiologist|gyn|gynae|gynaecologist|gynecologist|gynacologist|obgyn|ob-gyn|ob\/gyn)\b/.test(s)) kind = 'doctor';

  let specialty: string | undefined;
  for (const token of Object.keys(SPECIALTY_MAP)) {
    if (s.includes(token)) {
      specialty = SPECIALTY_MAP[token];
      break;
    }
  }

  return { type: 'nearby', kind, specialty };
}

