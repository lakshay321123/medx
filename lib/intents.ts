// lib/intents.ts
// MedX â€” Exhaustive Intents Library (Single-File Edition)
// ------------------------------------------------------------------
// What this provides
// - Rich intent detection for Patient and Doctor modes
// - Follow-up intent detector (medicines, hospitals, trials, vaccines)
// - Social intent detector (strict, optional)
// - Case-style detector for long clinical inputs (Doctor mode)
// - Intent-to-outline mapping â†’ returns concise markdown structure blocks
// - Utilities: classifyIntent, listIntents, defaultDraftStyle
//
// Design notes
// - Strings never contain ASCII three-dots `...`
// - Spread operators in code are fine; UI copy uses full words
// - All outlines finish with one short follow-up question instruction
//
// Usage (ChatPane.tsx):
//   import {
//     Mode,
//     getIntentStyle,
//     defaultDraftStyle,
//     classifyIntent,
//     listIntents,
//     detectFollowupIntent,
//     detectSocialIntentStrict,
//     isDoctorCaseStyle
//   } from "@/lib/intents";
//
//   const INTENT_STYLE = getIntentStyle(userText || "", mode);
//   const systemAll = `${sysWithDomain}${ADV_STYLE ? "\\n\\n" + ADV_STYLE : ""}\\n\\n${
//     defaultDraftStyle(mode)
//   }${INTENT_STYLE ? "\\n\\n" + INTENT_STYLE : ""}`;
//
// ------------------------------------------------------------------

export type Mode = "patient" | "doctor";

// ---------------- Follow-up intents (medicines, hospitals, trials, vaccines) ----------------
export type FollowupIntent = "medicines" | "hospitals" | "trials" | "vaccines" | null;

export function detectFollowupIntent(text: string): FollowupIntent {
  const q = (text || "").toLowerCase();
  if (/\b(medicine|medicines|drug|drugs|treatment|best med(s)?|best medicine|which medicine)\b/.test(q)) return "medicines";
  if (/\b(hospital|hospitals|top hospital(s)?|centre|center|clinic|er|emergency room)\b/.test(q)) return "hospitals";
  if (/\b(vaccine|vaccines|vaccination|immunization|immunisation|shot|jab|booster|flu shot)\b/.test(q)) return "vaccines";
  if (/\b(latest|newest|recent).*(trial|trials|study|studies|research)\b|\bclinical trial(s)?\b/.test(q)) return "trials";
  return null;
}

// ---------------- Optional: strict social intent (explicit yes/no only) ----------------
export type SocialIntent = "yes" | "no" | null;
export function detectSocialIntentStrict(input: string): SocialIntent {
  const s = (input || "").trim().toLowerCase().replace(/[.!?]+$/, "");
  if (!s) return null;
  const YES = new Set(["y","yes","ok","okay","sure","proceed","go ahead","continue","ðŸ‘","ðŸ‘Œ"]);
  const NO  = new Set(["n","no","stop","hold","cancel","do not","don't","ðŸ‘Ž"]);
  if (YES.has(s)) return "yes";
  if (NO.has(s)) return "no";
  return null;
}

// ---------------- Intent engine core ----------------
export type IntentSpec = {
  slug: string;
  title: string;
  triggers: (string|RegExp)[];
  outline: string[];
};

export type Match = { slug: string; score: number };

const normalize = (s: string) => (s || "").trim().toLowerCase();

/** Globbing to RegExp: '*' â†’ '\\w*', spaces flexible, hyphen optional */
function globre(s: string): RegExp {
  const esc = s.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "\\\\w*");
  const soft = esc.replace(/\s+/g, "\\s+").replace(/-/g, "[-\\s]?");
  return new RegExp(soft, "i");
}

function compile(specs: IntentSpec[]) {
  return specs.map(s => ({
    slug: s.slug,
    title: s.title,
    outline: s.outline,
    triggers: s.triggers.map(t => typeof t === "string" ? globre(t) : t)
  }));
}

function score(text: string, compiled: {triggers: RegExp[]}): number {
  let hits = 0;
  for (const re of compiled.triggers) if (re.test(text)) hits++;
  const denom = Math.max(2, Math.min(6, compiled.triggers.length));
  return hits / denom;
}

function toBlock(lines: string[], clinical = false): string {
  return [
    clinical ? "STRUCTURE (intent, clinical):" : "STRUCTURE (intent):",
    ...lines,
    "Finish with one short follow-up question (â‰¤10 words)."
  ].join("\\n");
}

// ---------------- Default drafting styles ----------------
export const PATIENT_DRAFT_STYLE = [
  "FORMAT: Use 2â€“3 short sections with bold headers and bullets.",
  "For 'what is' questions, default to these sections:",
  "## **What it is**",
  "## **Types**",
  "Finish with one short follow-up question (â‰¤10 words).",
].join("\\n");

export const DOCTOR_DRAFT_STYLE = [
  "FORMAT (clinical, concise): Use bold headers and bullets.",
  "For definition-type asks, prefer this outline:",
  "## **Definition (clinical)**",
  "## **Phenotypes**",
  "## **Red flags** (include only if relevant)",
  "## **Initial work-up (typical)** (include only if appropriate)",
  "Finish with one short follow-up question (â‰¤10 words).",
].join("\\n");

export function defaultDraftStyle(mode: Mode): string {
  return mode === "doctor" ? DOCTOR_DRAFT_STYLE : PATIENT_DRAFT_STYLE;
}

// ---------------- Doctor case-style detector ----------------
export function isDoctorCaseStyle(text: string): boolean {
  const s = (text || "").toLowerCase();
  const hints = [
    /\bvitals?:/,
    /\babg\b|arterial blood gas/,
    /\bchem(istry)?\b/,
    /\burinalysis\b/,
    /\bfi ?o2\b|\bpeep\b|\bplateau\b|\brr\b|\bvt\b/,
    /\bmap\b|\bcvp\b|\bpcwp\b|\bco\b|\bsvr\b/,
    /\b\d{1,3}-year-old\b/
  ];
  const numbers = (s.match(/\d+/g) || []).length;
  return hints.some(h => h.test(s)) && numbers >= 15;
}

// ---------------- Patient intents (broad & exhaustive) ----------------
const PATIENT_SPECS: IntentSpec[] = [
  // Understanding & basics
  { slug: "what_is", title: "What is", triggers: ["what is", "define", "explain", "overview", "summary", "in simple terms", "eli5"], outline: ["## **What it is**","## **Types**"] },
  { slug: "types", title: "Types", triggers: ["types", "kinds", "categories", "stages", "grades"], outline: ["## **Types**","## **How they differ**"] },
  { slug: "symptoms", title: "Symptoms", triggers: ["symptoms", "signs", "what does it feel like", "presentation"], outline: ["## **Common symptoms**","## **When to see a doctor (red flags)**"] },
  { slug: "causes", title: "Causes", triggers: ["why do i have", "why it happens", "causes", "triggers", "risk factors"], outline: ["## **Why it happens (common causes)**","## **Less common or serious causes**"] },
  { slug: "severity_serious", title: "Serious / red flags", triggers: ["is it serious", "should i be worried", "red flags", "danger signs", "emergency"], outline: ["## **Red flags â€” seek care now**","## **What is okay to watch at home**"] },
  { slug: "which_doctor", title: "Which doctor", triggers: ["which doctor", "which specialist", "who should i see", "which department"], outline: ["## **Who to see**","## **What to bring and ask**"] },

  // Diagnosis & tests
  { slug: "need_tests", title: "Do I need tests", triggers: ["do i need tests", "how is it diagnosed", "diagnosed", "diagnosis"], outline: ["## **Do I need tests**","## **What the tests show**"] },
  { slug: "imaging", title: "Imaging", triggers: ["imaging","xray","x-ray","ct","mri","ultrasound","do i need imaging"], outline: ["## **When imaging helps**","## **When imaging is not needed**"] },
  { slug: "report_meaning", title: "Explain my report", triggers: ["explain my report","what does my report mean","lab meaning","imaging report"], outline: ["## **What the report means**","## **What to do next**"] },
  { slug: "test_prep", title: "Prepare for test", triggers: ["prepare for test","before test","fasting","how to prepare","hold medications"], outline: ["## **How to prepare**","## **What to bring and expect**"] },

  // Treatment & safety
  { slug: "treatment", title: "Treatment options", triggers: ["treatment","manage","management","therapy","options","plan"], outline: ["## **First-line options**","## **If symptoms persist or worsen**"] },
  { slug: "medications", title: "Medications basics", triggers: ["medications","medicine","pill","tablet","drug"], outline: ["## **What to take (OTC or Rx)**","## **What to avoid and cautions**"] },
  { slug: "how_to_take", title: "How to take / dosing", triggers: ["how to take","with food","without food","missed dose","timing","schedule"], outline: ["## **How to take it**","## **If you miss a dose**"] },
  { slug: "side_effects", title: "Side effects", triggers: ["side effects","adverse effects","what to watch for","warning signs"], outline: ["## **Common side effects**","## **When to call a doctor**"] },
  { slug: "interactions", title: "Drug interactions", triggers: ["interactions","with my other meds","supplements","compatibility","can i take this with *"], outline: ["## **Major interactions**","## **How to take it safely**"] },
  { slug: "allergy", title: "Allergy", triggers: ["allergy","allergic","cross react","cross reaction","rash with"], outline: ["## **Allergy and cross reaction**","## **Safer alternatives**"] },

  // Home, lifestyle, practical
  { slug: "home_care", title: "Home care", triggers: ["home care","self care","at home","home remedies","remedy","self-help"], outline: ["## **At-home care**","## **When to stop and seek help**"] },
  { slug: "pain_relief", title: "Pain relief", triggers: ["pain relief","pain control","ice or heat","rest or activity"], outline: ["## **Ways to relieve pain**","## **What to avoid**"] },
  { slug: "diet", title: "Diet", triggers: ["diet","what to eat","foods to avoid","nutrition","meal plan","dietary pattern","low salt","low fodmap","mediterranean"], outline: ["## **What to eat**","## **What to limit or avoid**"] },
  { slug: "exercise", title: "Exercise and posture", triggers: ["exercise","stretch","activity","posture","ergonomics","physiotherapy","return to exercise"], outline: ["## **What is safe now**","## **Build-up plan**"] },
  { slug: "sleep", title: "Sleep", triggers: ["sleep","insomnia","sleep problems","sleep hygiene"], outline: ["## **Sleep tips**","## **When to get help**"] },
  { slug: "mental_health", title: "Mental health", triggers: ["mental health","anxiety","stress","mood","coping"], outline: ["## **What helps**","## **When to get extra support**"] },
  { slug: "return_to", title: "Return to activities", triggers: ["return to work","return to school","return to sport","when can i work","when can i drive","fit note","sick note"], outline: ["## **When you can resume**","## **What to watch for**"] },
  { slug: "travel", title: "Travel", triggers: ["travel","flying","trip","vacation","travel advice"], outline: ["## **Travel tips**","## **Medications and documents to carry**"] },
  { slug: "special_groups", title: "Special groups", triggers: ["pregnant","pregnancy","breastfeeding","kids","children","elderly","older adults"], outline: ["## **What is different in this group**","## **Safety notes**"] },
  { slug: "prognosis", title: "Prognosis", triggers: ["prognosis","will it come back","recurrence"], outline: ["## **What to expect**","## **Lower the chance it returns**"] },
  { slug: "prevention", title: "Prevention", triggers: ["prevent","prevention","avoid getting it","lower my risk"], outline: ["## **Daily habits**","## **When prevention is not enough**"] },
  { slug: "monitoring_home", title: "Monitoring at home", triggers: ["monitor at home","diary","log","tracker","symptom diary","home monitoring"], outline: ["## **What to track**","## **When to seek care**"] },
  { slug: "cost", title: "Cost", triggers: ["cost","insurance","covered","generic","brand","cheaper option","affordable"], outline: ["## **Lower cost options**","## **What to ask insurance**"] },
  { slug: "second_opinion", title: "Second opinion", triggers: ["second opinion","what to ask my doctor","questions to ask"], outline: ["## **Key questions to ask**","## **How to prepare**"] },
  { slug: "compare_dx", title: "Compare diagnoses", triggers: ["compare diagnoses","difference between * and *","how to tell if it is * or *","* vs * diagnosis"], outline: ["## **How they differ**","## **When to see a doctor**"] },
  { slug: "compare_tx", title: "Compare treatments", triggers: ["compare treatments","ibuprofen vs acetaminophen","which is better * or *","* vs * treatment"], outline: ["## **Pros and cons**","## **Which to prefer when**"] },
  { slug: "contagious", title: "Is it contagious", triggers: ["is it contagious","protect family","spread to others"], outline: ["## **Is it contagious**","## **How to protect others**"] },
  { slug: "caregiver", title: "Caregiver guidance", triggers: ["caregiver","how to help someone","family support"], outline: ["## **How to help**","## **What to watch for**"] },
  { slug: "vaccines", title: "Vaccines", triggers: ["vaccine","vaccination","immunization"], outline: ["## **Relevant vaccines**","## **Timing and eligibility**"] },
  { slug: "safety_home", title: "Safety at home", triggers: ["safety at home","falls","driving safety","home safety"], outline: ["## **Make home safer**","## **When to stop and seek help**"] },
  { slug: "post_procedure", title: "After procedure", triggers: ["post procedure","after surgery","wound care","bandage care","cast care","splint care","brace care"], outline: ["## **At-home care**","## **When to call your doctor**"] },
  { slug: "prepare_procedure", title: "Prepare for procedure", triggers: ["prepare for procedure","before surgery","before test","fasting","hold medications"], outline: ["## **How to prepare**","## **What to bring and expect**"] },
  { slug: "alt_therapies", title: "Alternative therapies", triggers: ["alternative","complementary","acupuncture","yoga","massage","chiropractic"], outline: ["## **What may help**","## **What to avoid**"] },
];

// ---------------- Doctor intents (broad & exhaustive) ----------------
const DOCTOR_SPECS: IntentSpec[] = [
  // Foundations
  { slug: "definition", title: "Definition (clinical)", triggers: ["definition","clinical definition","^define\\b"], outline: ["## **Definition (clinical)**","## **Phenotypes**"] },
  { slug: "epidemiology", title: "Epidemiology and risk", triggers: ["epidemiology","burden","risk factors"], outline: ["## **Epidemiology and risk factors**","## **Who to screen or suspect**"] },
  { slug: "pathophysiology", title: "Pathophysiology", triggers: ["pathophysiology","pathogenesis","mechanism"], outline: ["## **Mechanism and pathophysiology**","## **Clinical implications**"] },
  { slug: "natural_history", title: "Natural history", triggers: ["natural history","prognosis"], outline: ["## **Natural history**","## **Prognostic factors**"] },
  { slug: "phenotypes", title: "Phenotypes", triggers: ["phenotypes","subtypes","endotypes"], outline: ["## **Phenotypes and subtypes**","## **How they differ for dx or tx**"] },
  { slug: "criteria", title: "Diagnostic criteria", triggers: ["diagnostic criteria","classification criteria","severity","staging"], outline: ["## **Diagnostic criteria**","## **Severity and staging**"] },
  { slug: "red_flags", title: "Red flags", triggers: ["red flags","do not miss","danger signs"], outline: ["## **Red flags**","## **Immediate actions and escalation**"] },
  { slug: "ddx", title: "Differential diagnosis", triggers: ["differential","^ddx\\b"], outline: ["## **Differential diagnosis**","## **Rule-in and rule-out features**"] },

  // Work-up and testing
  { slug: "workup", title: "Initial work-up", triggers: ["initial work up","initial work-up","assessment","evaluation","tests","^work[-\\s]*up\\b"], outline: ["## **Initial work-up** (H and P, labs, imaging)","## **When to image and stewardship**"] },
  { slug: "imaging", title: "Imaging choice", triggers: ["imaging","xray","x-ray","ct","mri","ultrasound"], outline: ["## **Imaging choice (indications)**","## **Avoid imaging when not indicated**"] },
  { slug: "test_characteristics", title: "Test characteristics", triggers: ["sensitivity","specificity","likelihood ratio","cutoff","threshold"], outline: ["## **Test characteristics**","## **Clinical use and limits**"] },
  { slug: "scores", title: "Risk scores", triggers: ["score","calculator","risk score","wells","ottawa","frax"], outline: ["## **Risk stratification and scores**","## **How it changes management**"] },
  { slug: "interpretation", title: "Interpretation", triggers: ["lab interpretation","imaging interpretation","findings","reading","meaning"], outline: ["## **Interpretation**","## **Next steps**"] },

  // Management
  { slug: "algorithm", title: "Management algorithm", triggers: ["first line","first-line","management","algorithm","step up","step down"], outline: ["## **First-line management**","## **Step-up and referral**"] },
  { slug: "dosing", title: "Dosing and adjustments", triggers: ["dose","dosing","posology","mg","renal","hepatic","adjustments"], outline: ["## **Dosing** (adult or pediatric; renal or hepatic)","## **Monitoring and cautions**"] },
  { slug: "contra_interactions", title: "Contraindications and interactions", triggers: ["contraindication","interactions","black box"], outline: ["## **Contraindications and major interactions**","## **Risk mitigation**"] },
  { slug: "adverse_monitoring", title: "Adverse effects and monitoring", triggers: ["adverse effects","side effects","toxicity","monitoring"], outline: ["## **Adverse effects and monitoring**","## **When to stop or switch**"] },
  { slug: "deprescribing", title: "Deprescribing", triggers: ["deprescribe","deprescribing","taper"], outline: ["## **Deprescribing approach**","## **Follow-up and safety**"] },
  { slug: "non_pharm", title: "Non-pharmacologic", triggers: ["non pharm","non-pharm","physical therapy","rehab","brace","ergonomics"], outline: ["## **Non-pharmacologic**","## **Progression and criteria**"] },
  { slug: "procedure", title: "Procedure", triggers: ["procedure","injection","block","technique","indications"], outline: ["## **Indications and selection**","## **Technique and aftercare**"] },
  { slug: "peri_procedural", title: "Peri-procedural", triggers: ["peri op","peri-op","perioperative","anticoagulation","steroids"], outline: ["## **Peri-procedural plan**","## **Hold or bridge medications**"] },
  { slug: "antibiotic", title: "Antibiotics and micro", triggers: ["antibiotic","abx","micro","culture","antibiogram"], outline: ["## **Likely pathogens by setting**","## **Empiric and targeted options**"] },
  { slug: "special_populations", title: "Special populations", triggers: ["pregnancy","peds","geriatrics","ckd","cirrhosis","copd","cad","immunosuppressed"], outline: ["## **Special populations**","## **Adjustments and cautions**"] },
  { slug: "follow_up", title: "Follow-up", triggers: ["follow up","follow-up","monitoring","intervals"], outline: ["## **Monitoring and intervals**","## **Triggers to escalate**"] },
  { slug: "escalate", title: "Escalation and admission", triggers: ["admit","escalate","icu","unstable"], outline: ["## **When to escalate or admit**","## **Immediate stabilization**"] },

  // Evidence and operations
  { slug: "guidelines", title: "Guidelines and evidence", triggers: ["guideline","nice","acp","aan","who","evidence","meta analysis","meta-analysis","rct"], outline: ["## **Guideline or evidence highlights**","## **Where evidence is weak**"] },
  { slug: "nnt_nnh", title: "NNT or NNH and pitfalls", triggers: ["nnt","nnh","effect size","controversy","pitfalls","pearls"], outline: ["## **Benefit and harm (NNT or NNH)**","## **Pitfalls and uncertainties**"] },
  { slug: "documentation", title: "Documentation", triggers: ["soap","hpi","assessment and plan","a/p","template"], outline: ["## **Documentation template**","## **Billing drivers and coding hints**"] },
  { slug: "codes", title: "ICD-10 or CPT", triggers: ["icd 10","icd-10","cpt","prior auth","medical necessity"], outline: ["## **Codes and phrasing**","## **Key criteria to include**"] },
  { slug: "discharge", title: "Discharge and return precautions", triggers: ["discharge","return precautions","safety net","education"], outline: ["## **Discharge instructions**","## **Safety net and return precautions**"] },
  { slug: "telemedicine", title: "Telemedicine", triggers: ["telemedicine","virtual","remote"], outline: ["## **What is safe via telemedicine**","## **When in-person is required**"] },

  // Advanced
  { slug: "edge_cases", title: "Edge cases", triggers: ["atypical","refractory","failure","contraindicated","rare","complication"], outline: ["## **Edge cases**","## **Next steps and consultation**"] },
  { slug: "pop_specific", title: "Population-specific", triggers: ["lactation","pediatric","geriatric","renal","hepatic","immunosuppression"], outline: ["## **Population-specific considerations**","## **Dose or choice adjustments**"] },
];

// ---------------- Engine (compiled pools) ----------------
const P = compile(PATIENT_SPECS);
const D = compile(DOCTOR_SPECS);

/** Top matches (max N) with simple coverage scores */
export function classifyIntent(userText: string, mode: Mode, topN = 5): Match[] {
  const s = normalize(userText);
  const pool = mode === "doctor" ? D : P;
  return pool
    .map((spec) => ({ slug: spec.slug, score: score(s, spec) }))
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/** Return markdown structure block for user text and mode */
export function getIntentStyle(userText: string, mode: Mode): string {
  const s = normalize(userText);

  // Special: Doctor case-style override
  if (mode === "doctor" && isDoctorCaseStyle(s)) {
    return [
      "STRUCTURE (intent, clinical):",
      "## **Immediate priorities**",
      "## **Key calculations (derived)**",
      "## **Ventilation and oxygenation (initial adjustments)**",
      "## **Hemodynamics and fluids**",
      "## **Renal and metabolic**",
      "## **Initial orders (first hour)**",
      "Finish with one short follow-up question (â‰¤10 words)."
    ].join("\\n");
  }

  const pool = mode === "doctor" ? D : P;
  let best = pool[0];
  let bestScore = 0;
  for (const spec of pool) {
    const sc = score(s, spec);
    if (sc > bestScore) { bestScore = sc; best = spec; }
  }
  if (!best || bestScore <= 0) return "";
  return toBlock(best.outline, mode === "doctor");
}

/** List available intents for UI chips or menus */
export function listIntents(mode: Mode): { slug: string; title: string }[] {
  const pool = mode === "doctor" ? DOCTOR_SPECS : PATIENT_SPECS;
  return pool.map(({ slug, title }) => ({ slug, title }));
}

export default {
  getIntentStyle,
  classifyIntent,
  defaultDraftStyle,
  listIntents,
  detectFollowupIntent,
  detectSocialIntentStrict,
  isDoctorCaseStyle,
  PATIENT_DRAFT_STYLE,
  DOCTOR_DRAFT_STYLE,
};
