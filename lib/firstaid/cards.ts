const BASE_REFS = [
  'https://www.redcross.org/first-aid',
  'https://www.who.int/health-topics/first-aid'
];
const LEGAL = 'General information only — not medical advice.';

export type FirstAidCard = {
  card: {
    title: string;
    steps: string[];
    donts: string[];
    red_flags: string[];
    references: string[];
    legal: string;
  };
};

export function firstAidCard(text: string): FirstAidCard | null {
  const enabled = (process.env.FIRST_AID_FLOW || '').toLowerCase() === 'true';
  if (!enabled) return null;
  const t = text.toLowerCase();

  let scenario: 'bee_sting' | 'nosebleed' | 'burn' | 'cut' | 'generic';
  if (/bee|wasp/.test(t) && /sting|stung/.test(t)) scenario = 'bee_sting';
  else if (/nosebleed|nose bleed|epistaxis/.test(t)) scenario = 'nosebleed';
  else if (/burn/.test(t)) scenario = 'burn';
  else if (/cut|laceration|scrape|bleed/.test(t)) scenario = 'cut';
  else if (/injur|hurt|wound|bite/.test(t)) scenario = 'generic';
  else return null;

  const cards: Record<'bee_sting' | 'nosebleed' | 'burn' | 'cut' | 'generic', Omit<FirstAidCard['card'], 'references' | 'legal'>> = {
    bee_sting: {
      title: 'First Aid: Bee Sting',
      steps: [
        'Remove stinger quickly',
        'Wash area with soap and water',
        'Apply cold pack to reduce swelling'
      ],
      donts: ['Do not squeeze the venom sac', 'Avoid scratching the area'],
      red_flags: [
        'Difficulty breathing',
        'Swelling of face or throat',
        'Dizziness or fainting'
      ]
    },
    nosebleed: {
      title: 'First Aid: Nosebleed',
      steps: [
        'Sit upright and lean forward',
        'Pinch soft part of nose for 10 minutes',
        'Apply cool compress to nose bridge'
      ],
      donts: ['Do not lean back', 'Avoid stuffing tissues deep inside nostril'],
      red_flags: [
        'Bleeding longer than 20 minutes',
        'Nosebleed after head injury',
        'Trouble breathing'
      ]
    },
    burn: {
      title: 'First Aid: Minor Burn',
      steps: [
        'Cool burn under running water for 20 minutes',
        'Remove tight items like rings',
        'Cover with sterile, non-stick dressing'
      ],
      donts: ['Do not apply ice directly', 'Avoid popping blisters'],
      red_flags: [
        'Burn larger than palm',
        'Burn on face, hands, or genitals',
        'Signs of infection'
      ]
    },
    cut: {
      title: 'First Aid: Minor Cut',
      steps: [
        'Wash hands and clean wound',
        'Apply gentle pressure to stop bleeding',
        'Cover with sterile bandage'
      ],
      donts: ['Do not blow on wound', 'Avoid using hydrogen peroxide repeatedly'],
      red_flags: [
        'Bleeding does not stop after 10 minutes',
        'Deep or gaping wound',
        'Signs of infection'
      ]
    },
    generic: {
      title: 'First Aid: General Advice',
      steps: [
        'Keep person safe and monitor condition',
        'Call emergency services for severe symptoms'
      ],
      donts: ['Do not delay seeking help for serious injuries'],
      red_flags: [
        'Uncontrolled bleeding',
        'Breathing difficulties',
        'Loss of consciousness'
      ]
    }
  };

  const data = cards[scenario];
  const card: FirstAidCard = {
    card: { ...data, references: BASE_REFS, legal: LEGAL }
  };
  console.log('first aid card', { scenario });
  return card;
}

