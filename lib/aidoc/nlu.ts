import type { SymptomKey } from './rules';

export type Intent = 'boot'|'greet'|'summary_request'|'research'|'danger'|'medication_request'|'symptom'|'general';

export function classifyIntent(text: string): Intent {
  const t = (text||'').toLowerCase().trim();
  if (!t) return 'boot';
  if (/(hi|hello|hey|yo|good (morning|afternoon|evening)|what'?s up|sup)\b/.test(t)) return 'greet';
  if (/\b(show|see|give|view)\b.*\b(summary|recap|overview)\b/.test(t)) return 'summary_request';
  if (/\b(latest|new|recent)\b.*\b(treatment|trial|therapy|guideline|research)\b/.test(t)) return 'research';
  if (/\bdo i have\b.*(cancer|tb|covid|malaria|pneumonia)/.test(t)) return 'danger';
  if (/\bwhat\s+(medicine|tablet|pill|drug)\b|\bshould i take\b/.test(t)) return 'medication_request';
  if (/\b(fever|headache|migraine|cough|cold|sore throat|throat pain|back pain|low back|lumbar|vomit|diarrhea|pain|rash)\b/.test(t)) return 'symptom';
  return 'general';
}

export interface Entities {
  yesNo?: 'yes'|'no';
  negated?: boolean;
  duration?: string;
  tempC?: number;
  tempF?: number;
  painScore?: number;
  location?: string;
  qualifiers: string[];
}

const NO_RE = /\b(no|nope|nah|none|not really)\b|(^|\s)(just|only)\s+(fever|body( |)ache|pain)\b/i;

export function extractEntities(text: string): Entities {
  const t = text.toLowerCase();
  const e: Entities = { qualifiers: [] };

  if (NO_RE.test(text)) {
    e.yesNo = 'no';
    e.negated = true;
  } else if (/\b(yes|yeah|yep|sure)\b/.test(t)) {
    e.yesNo = 'yes';
  }

  const dur = t.match(/(\d+\s*(?:day|week|hour|month)s?)/);
  if (dur) e.duration = dur[0];

  const tempC = t.match(/(\d+(?:\.\d+)?)\s*c/);
  if (tempC) e.tempC = parseFloat(tempC[1]);
  const tempF = t.match(/(\d+(?:\.\d+)?)\s*f/);
  if (tempF) e.tempF = parseFloat(tempF[1]);

  const pain = t.match(/(\d{1,2})\s*(?:\/10|out of 10)/) || t.match(/pain\s*(\d{1,2})/);
  if (pain) {
    const val = parseInt(pain[1],10);
    if (!isNaN(val)) e.painScore = val;
  }

  const loc = t.match(/(lower back|upper back|left side|right side|leg|arm|chest|throat|head)/);
  if (loc) e.location = loc[1];

  return e;
}

export function detectSymptomKey(text: string): SymptomKey | null {
  const t = text.toLowerCase();
  if (t.includes('back pain') || t.includes('low back') || t.includes('lumbar')) return 'back_pain';
  if (t.includes('fever')) return 'fever';
  if (t.includes('headache') || t.includes('migraine')) return 'headache';
  if (t.includes('cough')) return 'cough';
  if (t.includes('sore throat') || t.includes('throat pain')) return 'sore_throat';
  if (t.includes('cold') || t.includes('runny nose')) return 'cold';
  return null;
}
