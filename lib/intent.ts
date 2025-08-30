import { bestFuzzyMatch } from '@/lib/fuzzy';

export function normalizeBestDoctorQuery(userText: string, countryCode: string) {
  const t = userText.toLowerCase();
  const isBest = /\b(best|top|most awarded|award[- ]?winning)\b/.test(t) && /\b(doc|doctor|oncolog|cardiolog|surgeon|specialist)\b/.test(t);
  if (!isBest) return null;

  // Don’t ask the model to name individuals. Ask it to guide to verifiable sources.
  return `User asked for "best doctor". Provide a safe, verifiable path in ${countryCode}.
1) Explain there is no single official 'best doctor' list.
2) Offer actions:
   • Show nearby relevant specialists (e.g., oncology, cardiology) with directions.
   • Link to official bodies in ${countryCode} (national medical council/registries, major specialty societies, government portals).
   • Suggest criteria (board certification, years of experience, academic affiliations, volume, outcomes where published).
3) Do not name specific individuals unless an official, citable source exists. Provide links only to official bodies and hospital finders. Keep concise.`;
}

export type NearbyKind = 'doctor' | 'clinic' | 'hospital' | 'pharmacy' | 'any';
export type NearbyIntent =
  | { type: 'nearby'; kind: NearbyKind; specialty?: string; corrected?: boolean; suggestion?: string }
  | { type: 'none' };

// Canonical specialties we support + common aliases
const SPECIALTY_CANON = [
  'gynecology','cardiology','dermatology','urology','neurology','orthopedics',
  'dentistry','pediatrics','psychiatry','ent','ophthalmology','endocrinology',
  'gastroenterology','pulmonology','nephrology','rheumatology','oncology'
];

const SPECIALTY_ALIASES: Record<string, string> = {
  // Gynecology (misspellings & synonyms)
  'gyn': 'gynecology','gyno': 'gynecology','gyney': 'gynecology',
  'gyne': 'gynecology','gynae': 'gynecology','gynaecologist': 'gynecology',
  'gynecologist': 'gynecology','gynacologist': 'gynecology',
  'obgyn': 'gynecology','ob-gyn': 'gynecology','ob/gyn': 'gynecology',
  'obstetrician': 'gynecology','obstetrics': 'gynecology','women doctor': 'gynecology',
  // A few more common ones (extend over time)
  'skin doctor': 'dermatology','heart doctor': 'cardiology','kidney doctor': 'nephrology',
  'lung doctor': 'pulmonology','bone doctor':'orthopedics','eye doctor':'ophthalmology',
};

const NEAR_ME_RE = /\b(near me|nearby|around me|closest|in my area)\b/i;

function extractCandidateSpecialty(text: string) {
  const s = text.toLowerCase();

  // 1) Alias hits (includes common phrases)
  for (const key of Object.keys(SPECIALTY_ALIASES)) {
    if (s.includes(key)) return SPECIALTY_ALIASES[key];
  }

  // 2) Single token after stripping "near me"
  // Try to grab likely token (e.g., "gynae", "dermatologist")
  const tokens = s.replace(NEAR_ME_RE, '').split(/[^a-z/+-]+/i).filter(Boolean);

  // Direct exact matches first
  for (const t of tokens) {
    if (SPECIALTY_CANON.includes(t)) return t;
  }

  // Fuzzy match against canon + known alias keys
  const dict = [...SPECIALTY_CANON, ...Object.keys(SPECIALTY_ALIASES)];
  for (const t of tokens) {
    const m = bestFuzzyMatch(t, dict, 2); // edit distance <= 2
    if (m) {
      // map alias to canon
      return SPECIALTY_ALIASES[m] || m;
    }
  }
  return undefined;
}

export function parseNearbyIntent(q: string): NearbyIntent {
  const s = (q || '').trim();
  if (!NEAR_ME_RE.test(s)) return { type: 'none' };

  // Base kind
  let kind: NearbyKind = 'any';
  const low = s.toLowerCase();
  if (/\b(pharmacy|chemist|drug ?store)\b/.test(low)) kind = 'pharmacy';
  else if (/\b(hospital|er|emergency)\b/.test(low)) kind = 'hospital';
  else if (/\b(clinic|urgent care|polyclinic)\b/.test(low)) kind = 'clinic';
  else if (/\b(doc|docs|doctor|doctors|physician|gp|dentist|dermatologist|cardiologist|gyn|gyno|gynae|gynecologist|gynaecologist|obgyn|ob-gyn|ob\/gyn)\b/.test(low))
    kind = 'doctor';

  // Specialty detection with autocorrect
  const spec = extractCandidateSpecialty(s);
  if (spec) {
    // If the raw text doesn't literally include the canonical word, treat as correction
    const corrected = !low.includes(spec);
    let suggestion: string | undefined = undefined;
    if (corrected) {
      // Build a nice human suggestion term
      const pretty = spec === 'ent' ? 'ENT' : spec.charAt(0).toUpperCase() + spec.slice(1);
      suggestion = `${pretty} near me`;
    }
    return { type: 'nearby', kind: kind === 'pharmacy' ? 'pharmacy' : 'doctor', specialty: spec, corrected, suggestion };
  }

  return { type: 'nearby', kind }; // generic nearby
}
