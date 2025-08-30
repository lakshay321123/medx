export type NearbyKind = 'doctor' | 'clinic' | 'hospital' | 'pharmacy' | 'any';

export function parseNearbyIntent(q: string):
  | { type: 'nearby'; kind: NearbyKind }
  | { type: 'none' } {
  const s = (q || '').toLowerCase().trim();

  // common phrasings
  const nearMe = /\b(near me|nearby|around me|closest|in my area)\b/;
  if (!nearMe.test(s)) return { type: 'none' };

  if (/\b(pharmacy|chemist|drug ?store)\b/.test(s)) return { type: 'nearby', kind: 'pharmacy' };
  if (/\b(hospital|er|emergency)\b/.test(s)) return { type: 'nearby', kind: 'hospital' };
  if (/\b(clinic|urgent care|polyclinic)\b/.test(s)) return { type: 'nearby', kind: 'clinic' };
  if (/\b(doctor|doctors|physician|gp|dentist|dermatologist|cardiologist)\b/.test(s))
    return { type: 'nearby', kind: 'doctor' };

  return { type: 'nearby', kind: 'any' };
}
