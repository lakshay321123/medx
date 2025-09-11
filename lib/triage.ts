const ENABLED = (process.env.SYMPTOM_TRIAGE_ENABLED || 'false').toLowerCase() === 'true';

export interface SymptomTriageInput {
  symptom: string;
  age?: number;
  durationDays?: number;
  flags?: string[];
}

export interface SymptomTriageResult {
  symptom: string;
  possible_causes: string[];
  self_care: string[];
  doctor_visit: string[];
  er_now: string[];
  assumptions?: string[];
}

export function symptomTriage(input: SymptomTriageInput): { triage: SymptomTriageResult } | null {
  if (!ENABLED) return null;
  const symptom = input.symptom.toLowerCase();
  const data: Record<string, Omit<SymptomTriageResult, 'symptom' | 'assumptions'>> = {
    fever: {
      possible_causes: ['Viral infection', 'Inflammatory conditions'],
      self_care: ['Hydration', 'Rest', 'Light clothing'],
      doctor_visit: ['Fever > 102°F for 3+ days', 'Fever with rash'],
      er_now: ['Confusion', 'Breathing difficulty'],
    },
    cough: {
      possible_causes: ['Common cold', 'Airway irritation'],
      self_care: ['Warm fluids', 'Honey (>1y)'],
      doctor_visit: ['Cough >2 weeks', 'Cough with fever >100.4°F'],
      er_now: ['Coughing blood', 'Severe shortness of breath'],
    },
    pain: {
      possible_causes: ['Muscle strain', 'Minor injury'],
      self_care: ['Rest', 'Over-the-counter pain reliever'],
      doctor_visit: ['Pain lasting >1 week', 'Pain with swelling'],
      er_now: ['Sudden severe pain', 'Pain after major injury'],
    },
  };
  const chosen = data[symptom] || {
    possible_causes: ['Various causes'],
    self_care: ['Rest', 'Hydration'],
    doctor_visit: ['Symptoms persistent or worsening'],
    er_now: ['Severe symptoms like chest pain or difficulty breathing'],
  };
  const assumptions: string[] = [];
  if (typeof input.age !== 'number') {
    assumptions.push('assuming adult');
  }
  const result: SymptomTriageResult = {
    symptom: capitalize(symptom),
    ...chosen,
    assumptions: assumptions.length ? assumptions : undefined,
  };
  if (result.er_now.length) {
    console.log('triage red-flag escalation', { symptom: result.symptom });
  }
  return { triage: result };
}

function capitalize(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

