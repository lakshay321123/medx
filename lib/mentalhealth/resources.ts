export type MentalHealthCard = {
  mental_health: {
    tips: string[];
    helplines: string[];
    red_flags: string[];
  };
};

const HELPLINES: Record<string, string[]> = {
  india: ['India: iCall 9152987821'],
  us: ['US: 988 Suicide & Crisis Lifeline'],
  uk: ['UK: Samaritans 116123'],
  global: [
    'WHO: https://www.who.int/teams/mental-health-and-substance-use',
    'Befrienders Worldwide: https://www.befrienders.org/'
  ]
};

export function mentalHealthResources(text: string, region?: string): MentalHealthCard | null {
  const enabled = (process.env.MENTAL_HEALTH_RESOURCES || '').toLowerCase() === 'true';
  if (!enabled) return null;
  const t = (text || '').toLowerCase();
  const hit = /(panic attack|anxiety|anxious|depressed|depression|grief|grieving|stress|stressed|can\'t sleep|cant sleep|insomnia)/.test(t);
  if (!hit) return null;
  const regionKey = (region || '').toLowerCase();
  const helplines = HELPLINES[regionKey] || HELPLINES.global;
  const card: MentalHealthCard = {
    mental_health: {
      tips: [
        'Box breathing: inhale 4s, hold 4s, exhale 4s',
        '5-4-3-2-1 grounding: notice 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste'
      ],
      helplines,
      red_flags: ['Suicidal thoughts \u2192 call emergency services']
    }
  };
  const suicide = /suicid|kill myself|end my life|hurt myself/.test(t);
  console.log('mental health resources', { region: regionKey, suicide });
  return card;
}
