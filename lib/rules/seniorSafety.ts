export interface SeniorSafetyCard {
  senior_safety: {
    home: string[];
    medications: string[];
    exercise: string[];
  };
}

export type PackCard = SeniorSafetyCard | Record<string, any>;

export function injectSeniorTips(cards: PackCard[], patient: any): PackCard[] {
  const enabled = (process.env.SENIOR_SAFETY_TIPS || 'false').toLowerCase() === 'true';
  const ageThreshold = Number(process.env.SENIOR_AGE_THRESHOLD || 65);
  if (!enabled) return cards;
  const age = typeof patient?.age === 'number' ? patient.age : undefined;
  const isSenior = (age !== undefined && age >= ageThreshold) || patient?.flags?.senior;
  if (!isSenior) return cards;
  const card: SeniorSafetyCard = {
    senior_safety: {
      home: [
        'Install grab bars in bathrooms',
        'Night lights in hallways',
        'Schedule regular vision and hearing checks'
      ],
      medications: [
        'Review meds causing drowsiness or dizziness'
      ],
      exercise: [
        'Tai Chi or balance classes'
      ]
    }
  };
  console.log('senior safety card generated', { count: 1 });
  return [...cards, card];
}
