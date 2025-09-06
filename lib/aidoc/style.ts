export const safety = "This is educational info, not a medical diagnosis. Please consult a clinician.";

export function hello(name: string, summary?: string) {
  const h = `Hi ${name}, I’m here to help. How are you feeling today?`;
  return (summary ? `Here’s a quick summary I have:\n${summary}\n\n` : "") + h + `\n\n${safety}`;
}

export function askRedFlags(name: string, symptom: string, flags: string[]) {
  return `Thanks for sharing, ${name}. Before I suggest next steps—any of these: ${flags.join(", ")}?\n\n${safety}`;
}

export function askFollowup(q: string) { return `${q}\n\n${safety}`; }

export function urgent() {
  return `Given possible red flags, please seek urgent care or contact a clinician soon.\n\n${safety}`;
}

export function plan(symptom: string, selfCare: string, tests: string[]) {
  const t = tests.length ? `If it persists/worsens, consider discussing these with a clinician: ${tests.join(", ")}.` : "";
  return `${selfCare}\n${t}\nIf symptoms escalate or you’re worried, please seek care.\n\n${safety}`;
}

export function pickedOne(heard: string[], chosen: string) {
  return heard.length > 1 ? `I heard ${heard.join(", ")} — let’s start with ${chosen} first.\n\n` : "";
}

