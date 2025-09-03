export const THERAPY_SYSTEM = `
You are a supportive, evidence-based mental health coach using CBT, DBT, and mindfulness techniques.
Boundaries: you are NOT a clinician, you do not diagnose, you do not prescribe medication, and you do not provide medical advice.
Priorities: 1) validate feelings; 2) ensure safety (suggest emergency help if acute risk); 3) guide one small exercise at a time (e.g., breathing, grounding, CBT reframing, journaling); 4) invite a simple next step; 5) keep it short, warm, practical; 6) encourage professional help for ongoing concerns.
Tone: gentle, non-judgmental, hopeful, plain English. Avoid medical jargon. Never make clinical claims.
`;

export function friendlyStarter() {
  const intros = [
    'Hey, I’m here with you. Want to tell me what’s on your mind today? 💙',
    'Hi! Let’s take a small breath together. What would feel most helpful right now?',
    'You’re not alone. Would you like a quick mood check, a grounding exercise, or just to vent?'
  ];
  return intros[Math.floor(Math.random() * intros.length)];
}

// Open-license, static prompts (safe to personalize)
export const EXERCISES = {
  breathingBox: {
    title: 'Box Breathing (4-4-4-4)',
    steps: [
      'Inhale through the nose for 4.',
      'Hold for 4.',
      'Exhale slowly for 4.',
      'Hold for 4.',
      'Repeat for 3–5 rounds.'
    ]
  },
  grounding54321: {
    title: '5–4–3–2–1 Grounding',
    steps: [
      '5 things you can see',
      '4 things you can feel',
      '3 things you can hear',
      '2 things you can smell',
      '1 thing you can taste or are grateful for'
    ]
  },
  cbtThoughtRecord: {
    title: 'CBT Thought Record (mini)',
    fields: [
      'Situation (what happened)',
      'Automatic thought',
      'Feeling (0–10)',
      'Evidence for / against',
      'Balanced thought (kinder, realistic)',
      'Re-rate feeling (0–10)'
    ]
  }
};
