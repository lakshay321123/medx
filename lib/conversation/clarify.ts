const CLARIFY_MINIMAL = process.env.CLARIFY_MINIMAL === 'true';
const CLARIFY_MAX_BACKTOBACK = Number(process.env.CLARIFY_MAX_BACKTOBACK || 1);

export type ClarifyIntent = 'pediatrics' | 'general_med' | 'symptom_pack';

export interface ClarifyInput {
  intent: ClarifyIntent;
  previousClarifiersAsked: number;
  userResponse: string | null;
}

export interface ClarifyOutput {
  nextQuestion: string | null;
  provisionalAnswer: string | null;
  assumptions: string[];
}

export function clarificationStep(
  { intent, previousClarifiersAsked, userResponse }: ClarifyInput
): ClarifyOutput {
  if (!CLARIFY_MINIMAL) {
    return { nextQuestion: null, provisionalAnswer: null, assumptions: [] };
  }

  const assumptions: string[] = [];

  if (previousClarifiersAsked >= CLARIFY_MAX_BACKTOBACK) {
    assumptions.push('assuming adult', 'assuming India region');
    return {
      nextQuestion: null,
      provisionalAnswer:
        'Providing best effort answer with limited info. General information only — not medical advice.',
      assumptions,
    };
  }

  const text = (userResponse || '').toLowerCase();

  switch (intent) {
    case 'pediatrics': {
      const ageBand = extractAge(text);
      const symptom = extractSymptom(text);
      const weight = hasWeight(text);
      if (!ageBand) {
        return {
          nextQuestion: 'How old is the child? (newborn, <6m, 6–24m, 2–5y, or 6–12y)',
          provisionalAnswer: null,
          assumptions,
        };
      }
      if (!symptom) {
        return {
          nextQuestion: 'What symptom are you looking to treat? (fever, cold, cough, diarrhea, vomiting, pain)',
          provisionalAnswer: null,
          assumptions,
        };
      }
      if (!weight) {
        return {
          nextQuestion: 'About how much does the child weigh?',
          provisionalAnswer: null,
          assumptions,
        };
      }
      return {
        nextQuestion: null,
        provisionalAnswer: 'General information only — not medical advice.',
        assumptions,
      };
    }
    case 'general_med': {
      const country = hasCountry(text);
      const brand = hasBrandOrGeneric(text);
      if (!country) {
        return {
          nextQuestion: 'Which country are you in?',
          provisionalAnswer: null,
          assumptions,
        };
      }
      if (!brand) {
        return {
          nextQuestion: 'Do you want brand-name or generic options?',
          provisionalAnswer: null,
          assumptions,
        };
      }
      return {
        nextQuestion: null,
        provisionalAnswer: 'General information only — not medical advice.',
        assumptions,
      };
    }
    case 'symptom_pack': {
      const duration = hasDuration(text);
      const redflag = hasRedFlag(text);
      if (!duration) {
        return {
          nextQuestion: 'How long have the symptoms been present?',
          provisionalAnswer: null,
          assumptions,
        };
      }
      if (!redflag) {
        return {
          nextQuestion: 'Any key red flags like fever >3d or bleeding?',
          provisionalAnswer: null,
          assumptions,
        };
      }
      return {
        nextQuestion: null,
        provisionalAnswer: 'General information only — not medical advice.',
        assumptions,
      };
    }
    default:
      assumptions.push('assuming adult', 'assuming India region');
      return {
        nextQuestion: null,
        provisionalAnswer: 'General information only — not medical advice.',
        assumptions,
      };
  }
}

function extractAge(t: string): string | undefined {
  if (/newborn/.test(t)) return 'newborn';
  if (/\b([0-5])\s*(m|months?)\b/.test(t)) return '<6m';
  if (/\b(6|7|8|9|1[0-1])\s*(m|months?)\b|\b1\s*(y|yr|year)\b/.test(t)) return '6-24m';
  if (/\b([2-5])\s*(y|yr|year)s?\b/.test(t)) return '2-5y';
  if (/\b([6-9]|1[0-2])\s*(y|yr|year)s?\b/.test(t)) return '6-12y';
  return undefined;
}

function extractSymptom(t: string): string | undefined {
  const m = t.match(/fever|cold|cough|diarrhea|vomiting|pain/);
  return m ? m[0] : undefined;
}

function hasWeight(t: string): boolean {
  return /\b\d+\s*(kg|kilograms|lbs|pounds)\b/.test(t);
}

function hasCountry(t: string): boolean {
  return /(india|united states|usa|uk|canada|australia)/.test(t);
}

function hasBrandOrGeneric(t: string): boolean {
  return /(brand|generic)/.test(t);
}

function hasDuration(t: string): boolean {
  return /\b\d+\s*(d|day|days|week|w|weeks)\b/.test(t);
}

function hasRedFlag(t: string): boolean {
  return /(fever\s*>\s*3\s*d|bleeding|shortness of breath)/.test(t);
}
