export type SymptomKey = 'fever'|'back_pain'|'headache'|'cough'|'sore_throat'|'cold';

export const RED_FLAGS: Record<SymptomKey,string[]> = {
  fever: ["fever > 39.4°C for >3 days","stiff neck","severe headache","rash with fever","confusion","severe dehydration"],
  back_pain: ["severe weakness in legs","loss of bladder/bowel control","numbness in groin/saddle area","fever with back pain","recent significant trauma"],
  headache: ["sudden worst headache","stiff neck","neurologic weakness","vision loss"],
  cough: ["blue lips","shortness of breath at rest","coughing blood","chest pain with breath"],
  sore_throat: ["drooling/trouble swallowing","severe breathing trouble"],
  cold: []
};

export const FOLLOWUPS: Record<SymptomKey, {id:string; ask:string; capture:keyof import('./nlu').Entities}[]> = {
  fever: [
    { id:'duration', ask:'How long has the fever been present? (e.g., 2 days, 36 hours)', capture:'duration' },
    { id:'temp', ask:'What’s the highest temperature you’ve noted? (C or F)', capture:'tempC' }
  ],
  back_pain: [
    { id:'duration', ask:'How long has the back pain been present?', capture:'duration' },
    { id:'location', ask:'Where is it most intense (lower back, one side, radiating)?', capture:'location' },
    { id:'pain', ask:'On a scale of 0–10, how bad is it at rest?', capture:'painScore' }
  ],
  headache: [
    { id:'duration', ask:'How long has the headache been present?', capture:'duration' },
    { id:'pain', ask:'Pain 0–10 at its worst?', capture:'painScore' }
  ],
  cough: [
    { id:'duration', ask:'How long has the cough been present?', capture:'duration' }
  ],
  sore_throat: [
    { id:'duration', ask:'How long has the throat pain been present?', capture:'duration' }
  ],
  cold: [
    { id:'duration', ask:'How long have the cold symptoms been present?', capture:'duration' }
  ]
};

export const SELF_CARE: Record<SymptomKey,string> = {
  fever: "Hydration, rest, temperature monitoring; people often consider paracetamol per label if suitable.",
  back_pain: "Relative rest 24–48h, heat/ice, gentle mobility & core stretches; avoid heavy lifting. People sometimes consider paracetamol per label if appropriate.",
  headache: "Hydration, sleep hygiene, reduce screen strain; paracetamol per label if appropriate.",
  cough: "Warm fluids, honey (adults), steam inhalation; avoid smoke/irritants.",
  sore_throat: "Warm salt-water gargles, fluids; lozenges (adults) if suitable.",
  cold: "Rest, fluids, saline nasal rinse; most colds settle in 7–10 days."
};

export const TESTS: Record<SymptomKey,string[]> = {
  fever: ["CBC","malaria rapid/smear (context)","COVID/flu (if exposure)"],
  back_pain: ["Physiotherapy assessment","MRI lumbar spine if persistent >2–6 weeks or neurologic signs","Urgent review if red flags"],
  headache: ["BP check","CBC if systemic symptoms","Eye exam; neurology review if red flags"],
  cough: ["CBC","Chest X-ray if >3 weeks","COVID/flu if exposure"],
  sore_throat: ["Throat swab/rapid strep (as applicable)"],
  cold: []
};

