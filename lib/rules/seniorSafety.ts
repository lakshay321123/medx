const ENABLED = (process.env.SENIOR_SAFETY_TIPS || 'false').toLowerCase() === 'true';
const AGE_THRESHOLD = Number(process.env.SENIOR_AGE_THRESHOLD || 65);

export interface PackCard { lines: string[] }

export function injectSeniorTips(cards: PackCard[], patient: any): PackCard[] {
  if (!ENABLED) return cards;
  const age = typeof patient?.age === 'number' ? patient.age : undefined;
  const isSenior = (age !== undefined && age >= AGE_THRESHOLD) || patient?.flags?.senior;
  if (!isSenior) return cards;
  const tips = [
    'May increase fall risk; rise slowly.',
    'Check kidney function with clinician if used regularly.'
  ];
  const poly = Array.isArray(patient?.meds) && patient.meds.length >= 5;
  if (poly) tips.push('Interaction check with clinician.');
  let count = 0;
  const out = cards.map(card => {
    const lines = [...card.lines, ...tips];
    count += tips.length;
    return { ...card, lines };
  });
  if (count) console.log('senior tips injected', { count });
  return out;
}
