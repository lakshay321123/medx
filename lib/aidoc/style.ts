export const SAFETY = 'This is educational info, not a medical diagnosis. Please consult a clinician.';

export function hello(name?: string, summary?: string) {
  const n = name ? `Hi ${name}!` : 'Hi!';
  const s = summary ? ` ${summary}` : '';
  return `${n} I'm here to help with quick health questions.${s} ${SAFETY}`;
}

export function askRedFlags(name: string | null, symptom: string, flags: string[]) {
  const intro = name ? `Got it ${name}.` : 'Got it.';
  const list = flags.map(f => `- ${f}`).join('\n');
  return `${intro} Any of these with your ${symptom}?\n${list}`;
}

export function askFollowup(q: string) {
  return q;
}

export function urgent() {
  return `That sounds serious. Please seek urgent medical care. ${SAFETY}`;
}

export function plan(symptom: string, selfCare: string, tests: string[], whenToSee: string) {
  const testStr = tests.length ? `Discuss with a clinician: ${tests.join(', ')}.\n` : '';
  return `For ${symptom}, ${selfCare}\n${testStr}${whenToSee}\n${SAFETY}`;
}

export function pickedOne(heard: string[], chosen: string) {
  return `Heard ${heard.join(', ')} — focusing on ${chosen}.`;
}
