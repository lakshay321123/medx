export type WomensHealthCard = {
  womens_health: {
    nutrition: string[];
    normal_symptoms: string[];
    red_flags: string[];
    references: string[];
  };
};

const BASE_REFS = [
  'ACOG: https://www.acog.org/womens-health',
  'WHO: https://www.who.int/health-topics/pregnancy'
];

// simple usage counter for observability
const usage: Record<string, number> = {
  irregular_periods: 0,
  pregnancy_nutrition: 0,
  postpartum_care: 0
};

export function womensHealthInfo(text: string, trimester?: string): WomensHealthCard | null {
  const enabled = (process.env.WOMENS_HEALTH_INFO || '').toLowerCase() === 'true';
  if (!enabled) return null;
  const t = (text || '').toLowerCase();

  let topic: 'irregular_periods' | 'pregnancy_nutrition' | 'postpartum_care';
  if (/(irregular.*period|period.*irregular|missed period(s)?|cycle problem)/.test(t)) topic = 'irregular_periods';
  else if (/pregnancy nutrition|pregnancy diet|antenatal|prenatal/.test(t)) topic = 'pregnancy_nutrition';
  else if (/postpartum|post partum|after birth|postnatal/.test(t)) topic = 'postpartum_care';
  else return null;

  usage[topic] += 1;

  const cards: Record<typeof topic, WomensHealthCard['womens_health']> = {
    irregular_periods: {
      nutrition: ['Balanced diet with fruits and vegetables', 'Maintain healthy weight'],
      normal_symptoms: ['Cycle length may vary a few days'],
      red_flags: ['No periods for >3 months → visit clinician', 'Heavy bleeding soaking pads hourly'],
      references: BASE_REFS
    },
    pregnancy_nutrition: {
      nutrition: ['Folic acid supplementation', 'Iron-rich foods'],
      normal_symptoms: trimester ? [`Mild fatigue in ${trimester} trimester`] : ['Mild fatigue in early pregnancy'],
      red_flags: ['Severe bleeding → ER visit', 'High blood pressure or severe headache → call doctor'],
      references: BASE_REFS
    },
    postpartum_care: {
      nutrition: ['Hydration and balanced meals for recovery', 'Extra calories if breastfeeding'],
      normal_symptoms: ['Mild mood changes and fatigue'],
      red_flags: ['Fever over 100.4°F (38°C)', 'Heavy bleeding or clots → seek care'],
      references: BASE_REFS
    }
  };

  const card: WomensHealthCard = { womens_health: cards[topic] };
  console.log('womens health info', { topic, trimester: trimester || 'general' });
  return card;
}

export { usage as womensHealthUsage };
