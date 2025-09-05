export type SymptomKey = 'fever'|'headache'|'cough'|'sore_throat'|'cold'|'back_pain';

const GENERIC_FLAGS = [
  "chest pain or pressure", "severe shortness of breath",
  "confusion or hard to wake", "fainting", "uncontrolled bleeding"
];

const FLAGS: Record<SymptomKey, string[]> = {
  back_pain: [
    "severe weakness in legs", "loss of bladder or bowel control",
    "numbness in groin/saddle area", "fever with back pain",
    "recent significant trauma"
  ],
  fever: [
    "fever > 39.4°C (103°F) for > 3 days", "stiff neck", "severe headache",
    "rash with fever", "confusion", "severe dehydration"
  ],
  headache: ["sudden worst headache", "stiff neck", "neurologic weakness"],
  cough: ["blue lips", "shortness of breath at rest", "coughing blood"],
  sore_throat: ["drooling/trouble swallowing", "severe breathing trouble"],
  cold: []
};

export function getFlagList(key: SymptomKey): string[] {
  const list = FLAGS[key] || [];
  return list.length ? list : GENERIC_FLAGS;
}

// Simple text match for any flag phrase
export function textMentionsAnyFlag(text: string, key: SymptomKey): boolean {
  const t = text.toLowerCase();
  return getFlagList(key).some(p => t.includes(p.toLowerCase().split(' ')[0]));
}
