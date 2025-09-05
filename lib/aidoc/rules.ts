export type SymptomKey = 'fever'|'back_pain'|'headache'|'cough'|'sore_throat'|'cold';

export const FRAMES: Record<SymptomKey, {
  redFlags: string[];
  followups: { id: string; ask: string; capture: 'duration'|'temp'|'painScore'|'location'|null }[];
  selfCare: string;
  tests: string[];
  whenToSee: string;
}> = {
  fever: {
    redFlags: [
      "fever > 39.4°C for >3 days",
      "stiff neck",
      "severe headache",
      "rash with fever",
      "confusion",
      "severe dehydration"
    ],
    followups: [
      { id:'duration', ask:'How long has the fever been present?', capture:'duration' },
      { id:'temp', ask:'What is the highest temperature noted? (C/F)', capture:'temp' }
    ],
    selfCare: "Hydration, rest, temperature monitoring; people often consider paracetamol as per label if suitable.",
    tests: ["CBC","malaria rapid/smear (context)","COVID/flu (if exposure)"],
    whenToSee: "See a clinician if fever persists >3 days, severe symptoms develop, or you’re worried."
  },
  back_pain: {
    redFlags: [
      "severe weakness in legs",
      "loss of bladder/bowel control",
      "numbness in groin/saddle area",
      "fever with back pain",
      "recent significant trauma"
    ],
    followups: [
      { id:'duration', ask:'How long has the back pain been present?', capture:'duration' },
      { id:'location', ask:'Where is it most intense (lower back, one side, radiating to leg)?', capture:'location' },
      { id:'pain', ask:'On a scale of 0–10, how bad is it at rest?', capture:'painScore' }
    ],
    selfCare: "Relative rest 24–48h, heat/ice, gentle mobility & core stretches; avoid heavy lifting. People sometimes consider paracetamol per label if appropriate.",
    tests: ["Physiotherapy assessment","MRI lumbar spine if persistent >2–6 weeks or neurologic signs","Urgent review if red flags"],
    whenToSee: "See a clinician if pain is severe, persistent, or red flags appear."
  },
  headache: {
    redFlags: ["sudden worst headache","stiff neck","neurologic weakness"],
    followups: [
      { id:'duration', ask:'How long has the headache been present?', capture:'duration' },
      { id:'pain', ask:'On a scale of 0–10, how severe is it?', capture:'painScore' }
    ],
    selfCare: "Hydration, sleep hygiene, reduce screen strain; people sometimes consider paracetamol per label if appropriate.",
    tests: ["BP check","CBC (if systemic symptoms)","consider eye exam (if strain)","neurology consult if red flags"],
    whenToSee: "See a clinician if headaches are new, very severe, or persistent."
  },
  cough: {
    redFlags: ["blue lips","shortness of breath at rest","coughing blood"],
    followups: [
      { id:'duration', ask:'How long has the cough lasted?', capture:'duration' },
      { id:'qual', ask:'Is it dry or productive?', capture:null }
    ],
    selfCare: "Warm fluids, honey (adults), steam inhalation; avoid smoke/irritants.",
    tests: ["CBC","chest X-ray (if persistent >3 weeks)","COVID/flu (if exposure)","spirometry (if wheeze/asthma hx)"],
    whenToSee: "See a clinician if cough lasts >3 weeks, breathing issues, or high fever."
  },
  sore_throat: {
    redFlags: ["drooling/trouble swallowing","severe breathing trouble"],
    followups: [
      { id:'duration', ask:'How long has the sore throat been present?', capture:'duration' },
      { id:'temp', ask:'Do you have a fever? If yes, what temperature?', capture:'temp' }
    ],
    selfCare: "Warm salt-water gargles, fluids; lozenges (adults) if suitable.",
    tests: ["Rapid strep/ throat swab (as applicable)","CBC if prolonged","CRP (if clinician requests)"],
    whenToSee: "See a clinician if severe pain, trouble breathing, or symptoms persist >1 week."
  },
  cold: {
    redFlags: [],
    followups: [
      { id:'duration', ask:'How long have the cold symptoms been present?', capture:'duration' },
      { id:'qual', ask:'Any fever or difficulty breathing?', capture:null }
    ],
    selfCare: "Rest, fluids, saline nasal rinse; most colds settle in 7–10 days.",
    tests: ["Usually supportive care; tests rarely needed unless persistent/worsening"],
    whenToSee: "See a clinician if symptoms persist >10 days, high fever develops, or you’re worried."
  }
};
