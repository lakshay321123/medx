import { NearbyIntent, parseNearbyIntent } from '@/lib/intent'; // reuse your nearby logic
import { initialState, DialogueState } from './dialogue';

const CONDITION_HINTS = [
  'cancer','diabetes','hypertension','migraine','asthma','thyroid','dry cough','wet cough',
  'alopecia','baldness','pcos','pcod','back pain','sciatica'
];

export function inferIntentAndSlots(mode: 'patient'|'doctor', text: string, countryCode?: string | null): DialogueState {
  const s = initialState(mode, countryCode);
  const low = text.toLowerCase();

  // 1) Nearby?
  const nearby: any = parseNearbyIntent(text); // your existing method (with autocorrect & specialtyGroup)
  if (nearby.type === 'nearby') {
    s.intent = nearby.specialtyGroup ? 'doc_finder_spine_group' : 'nearby';
    s.slots.specialty = nearby.specialty;
    s.slots.specialtyGroup = nearby.specialtyGroup;
    s.confidence = 0.9;
    return s;
  }

  // 2) Clinical trials?
  if (/\b(trial|nct|clinical trial|latest trials)\b/.test(low)) {
    s.intent = 'clinical_trials';
    s.slots.condition = extractCondition(low);
    s.confidence = 0.8;
    return s;
  }

  // 3) Medication advice?
  if (/\b(cough|syrup|tablet|medicine|medication|dose|otc)\b/.test(low)) {
    s.intent = 'medication_advice';
    s.slots.condition = extractCoughVariant(low) || extractCondition(low);
    s.confidence = 0.75;
    return s;
  }

  // 4) Condition overview default
  if (/\b(cancer|diabetes|asthma|thyroid|alopecia|baldness|migraine|pcos|pcod|sciatica)\b/.test(low)) {
    s.intent = 'condition_overview';
    s.slots.condition = extractCondition(low);
    s.confidence = 0.7;
    return s;
  }

  s.intent = 'unknown';
  s.confidence = 0.4;
  return s;
}

function extractCondition(low: string): string | undefined {
  for (const c of CONDITION_HINTS) if (low.includes(c)) return c;
  return undefined;
}
function extractCoughVariant(low: string): string | undefined {
  if (low.includes('dry cough')) return 'dry cough';
  if (low.includes('wet cough') || low.includes('productive cough')) return 'wet cough';
  if (low.includes('cough')) return 'cough';
  return undefined;
}
