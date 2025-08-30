export function detectClarification(userText: string): { ask?: string; chips?: string[] } | null {
  const t = userText.toLowerCase();

  if (/\bcough\b/.test(t) && !/(dry|wet|productive)/.test(t)) {
    return { ask: 'Is it **dry** or **wet/productive** cough? Any fever or wheeze?', chips: ['Dry cough', 'Wet cough', 'With fever'] };
  }

  if (/near me|nearby|close by|around me/.test(t) && /\b(doc|doctor|doctors|clinic|hospital)\b/.test(t) && !/(gyn|cardio|derm|spine|ortho|neuro)/i.test(t)) {
    return { ask: 'Which specialist do you need nearby?', chips: ['Gynecologist', 'Cardiologist', 'Orthopedic', 'Spine clinic'] };
  }

  if (/\b(best|top|most awarded)\b/.test(t) && /\bdoctor|oncolog/i.test(t)) {
    return { ask: 'Awards vary by subspecialty and year. Shall I show **oncology specialists near you** or **national award sources**?', chips: ['Oncology near me', 'Search national awards'] };
  }

  return null;
}
