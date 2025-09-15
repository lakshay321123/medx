// lib/intents.ts
// MedX — Exhaustive Patient/Doctor Intent Mapper (Structure-Only)
// ------------------------------------------------------------------
// What this does
// - Maps free-text questions to a concise markdown outline (structure block)
// - Meant to be appended to your system prompt (no provider/model changes)
// - Covers a very wide range of patient + doctor stems (easily extensible)
//
// How to use (in ChatPane.tsx):
//   import {
//     getIntentStyle,
//     PATIENT_DRAFT_STYLE,
//     DOCTOR_DRAFT_STYLE,
//     listIntents
//   } from "@/lib/intents";
//
//   const INTENT_STYLE = getIntentStyle(userText || "", mode);
//   const systemAll = `${sysWithDomain}${ADV_STYLE ? "\\n\\n" + ADV_STYLE : ""}\\n\\n${
//     mode === "doctor" ? DOCTOR_DRAFT_STYLE : PATIENT_DRAFT_STYLE
//   }${INTENT_STYLE ? "\\n\\n" + INTENT_STYLE : ""}`;
//
// Notes
// - This file is structure-only. Keep your soft-cap logic in /api/chat/stream.
// - If a query doesn’t match any specific intent, you’ll still get the default
//   Patient/Doctor drafting styles from PATIENT_DRAFT_STYLE / DOCTOR_DRAFT_STYLE.
//
// ------------------------------------------------------------------

export type Mode = "patient" | "doctor";

export type IntentSpec = {
  slug: string;              // unique id (use in chips/router)
  title: string;             // human label
  triggers: (string|RegExp)[]; // matching patterns (loose, '*' wildcard supported)
  outline: string[];         // section headers to use in the answer
};

export type Match = { slug: string; score: number };

// ------------------------ Utilities ------------------------

const normalize = (s: string) => (s || "").trim().toLowerCase();

/** Escape regex special chars except the '*' wildcard, which becomes \w* */
function globre(s: string): RegExp {
  const esc = s.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "\\\\w*");
  const soft = esc.replace(/\s+/g, "\\s+").replace(/-/g, "[-\\s]?");
  return new RegExp(soft, "i");
}

/** Compile trigger strings to regexes; keep RegExp as-is */
function compile(specs: IntentSpec[]) {
  return specs.map(s => ({
    slug: s.slug,
    title: s.title,
    outline: s.outline,
    triggers: s.triggers.map(t => typeof t === "string" ? globre(t) : t)
  }));
}

/** Score how well text matches a spec (fraction-like coverage) */
function score(text: string, compiled: {triggers: RegExp[]}): number {
  let hits = 0;
  for (const re of compiled.triggers) if (re.test(text)) hits++;
  // normalize denominator: longer trigger lists shouldn't be penalized
  const denom = Math.max(2, Math.min(6, compiled.triggers.length));
  return hits / denom;
}

/** Compose the markdown structure block */
function toBlock(lines: string[], clinical = false): string {
  return [
    clinical ? "STRUCTURE (intent, clinical):" : "STRUCTURE (intent):",
    ...lines,
    "Finish with one short follow-up question (≤10 words)."
  ].join("\\n");
}

// ---------------- Default per-mode drafting styles ----------------

export const PATIENT_DRAFT_STYLE = [
  "FORMAT: Use 2–3 short sections with bold headers and bullets.",
  "For 'what is ...' questions, default to these sections:",
  "## **What it is**",
  "## **Types**",
  "Finish with one short follow-up question (≤10 words).",
].join("\\n");

export const DOCTOR_DRAFT_STYLE = [
  "FORMAT (clinical, concise): Use bold headers + bullets.",
  "For definition-type asks, prefer this outline:",
  "## **Definition (clinical)**",
  "## **Phenotypes**",
  "## **Red flags** (include only if relevant)",
  "## **Initial work-up (typical)** (include only if appropriate)",
  "Finish with one short follow-up question (≤10 words).",
].join("\\n");

// ---------------- Patient intents (broad coverage) ----------------

const PATIENT_SPECS: IntentSpec[] = [
  // Core understanding
  { slug: "what_is", title: "What is …", triggers: [
      "what is", "define", "explain", "in simple terms", "eli5", "in 3 lines", "overview", "summary"
    ], outline: ["## **What it is**","## **Types**"] },
  { slug: "types", title: "Types", triggers: [
      "types", "kinds", "categories", "stages", "grades", "classes"
    ], outline: ["## **Types**","## **How they differ**"] },
  { slug: "symptoms", title: "Symptoms", triggers: [
      "symptoms", "signs", "is * a symptom", "what does it feel like", "presentation"
    ], outline: ["## **Common symptoms**","## **When to see a doctor (red flags)**"] },
  { slug: "causes", title: "Causes", triggers: [
      "why do i have", "causes", "cause", "why it happens", "triggers", "risk factors"
    ], outline: ["## **Why it happens (common causes)**","## **Less common/serious causes**"] },
  { slug: "serious_redflags", title: "Is it serious / red flags", triggers: [
      "is it serious", "should i be worried", "red flags", "danger signs", "emergency"
    ], outline: ["## **Red flags — seek care now**","## **What’s okay to watch at home**"] },
  { slug: "which_doctor", title: "Which doctor/specialist", triggers: [
      "which doctor", "which specialist", "who should i see", "which department"
    ], outline: ["## **Who to see**","## **What to bring / ask**"] },

  // Tests / imaging / results
  { slug: "need_tests", title: "Do I need tests?", triggers: [
      "do i need tests", "which tests", "how is it diagnosed", "diagnosed", "diagnosis"
    ], outline: ["## **Do I need tests?**","## **What the tests show**"] },
  { slug: "imaging", title: "Imaging", triggers: [
      "imaging", "xray", "x-ray", "ct", "mri", "ultrasound", "do i need imaging"
    ], outline: ["## **When imaging helps**","## **When imaging isn’t needed**"] },
  { slug: "report_meaning", title: "Explain my report", triggers: [
      "what does my report mean", "explain my report", "lab meaning", "test meaning", "imaging report", "radiology report"
    ], outline: ["## **What the report means**","## **What to do next**"] },
  { slug: "test_prep", title: "Prepare for tests", triggers: [
      "prepare for test", "before test", "fasting", "how to prepare", "hold medications"
    ], outline: ["## **How to prepare**","## **What to bring/expect**"] },

  // Treatment / meds / safety
  { slug: "treatment", title: "Treatment options", triggers: [
      "treatment", "manage", "management", "options", "therapy", "plan"
    ], outline: ["## **First-line options**","## **If symptoms persist/worsen**"] },
  { slug: "medications", title: "Medications (what/avoid)", triggers: [
      "medications", "medication", "medicine", "pill", "tablet", "drug"
    ], outline: ["## **What to take (OTC/Rx)**","## **What to avoid / cautions**"] },
  { slug: "how_to_take", title: "How to take / dosing basics", triggers: [
      "how to take", "with food", "without food", "missed dose", "timing", "schedule"
    ], outline: ["## **How to take it**","## **If you miss a dose**"] },
  { slug: "side_effects", title: "Side effects", triggers: [
      "side effects", "what to watch for", "adverse effects", "warning signs after starting"
    ], outline: ["## **Common side effects**","## **When to call a doctor**"] },
  { slug: "interactions", title: "Drug interactions", triggers: [
      "interactions", "with my other meds", "with my medication", "supplements", "compatibility", "can i take this with *"
    ], outline: ["## **Major interactions**","## **How to take it safely**"] },
  { slug: "allergy", title: "Allergy/cross-reaction", triggers: [
      "allergy", "allergic", "can i take if allergic", "cross-react"
    ], outline: ["## **Allergy/cross-reaction**","## **Safe alternatives**"] },

  // Home care / lifestyle / practical
  { slug: "home_care", title: "Home care", triggers: [
      "home care", "self care", "at home", "home remedies", "remedy", "self-help"
    ], outline: ["## **At-home care**","## **When to stop home care and seek help**"] },
  { slug: "pain_relief", title: "Pain relief at home", triggers: [
      "pain relief", "pain control", "pain management at home", "ice or heat", "rest or activity"
    ], outline: ["## **Ways to relieve pain**","## **What to avoid**"] },
  { slug: "diet", title: "Diet", triggers: [
      "diet", "what to eat", "foods to avoid", "nutrition", "meal plan", "dietary pattern", "low-salt", "low-fodmap", "mediterranean"
    ], outline: ["## **What to eat**","## **What to limit/avoid**"] },
  { slug: "exercise", title: "Exercise / posture / PT", triggers: [
      "exercise", "stretch", "activity", "posture", "ergonomics", "physiotherapy", "yoga", "return to exercise"
    ], outline: ["## **What’s safe now**","## **Build-up plan**"] },
  { slug: "sleep", title: "Sleep", triggers: [
      "sleep", "insomnia", "sleep problems", "sleep hygiene"
    ], outline: ["## **Sleep tips**","## **When to get help**"] },
  { slug: "mental_health", title: "Mental health / coping", triggers: [
      "mental health", "anxiety", "stress", "mood", "coping"
    ], outline: ["## **What helps**","## **When to get extra support**"] },
  { slug: "return_to", title: "Return to work/school/sport", triggers: [
      "return to work", "return to school", "return to sport", "when can i work", "when can i drive", "fit note", "sick note"
    ], outline: ["## **When you can resume**","## **What to watch for**"] },
  { slug: "travel", title: "Travel advice", triggers: [
      "travel", "flying", "trip", "vacation", "travel advice"
    ], outline: ["## **Travel tips**","## **Medications/docs to carry**"] },
  { slug: "special_groups", title: "Special groups (pregnancy/kids/elderly)", triggers: [
      "pregnant", "pregnancy", "breastfeeding", "kids", "children", "elderly", "older adults"
    ], outline: ["## **What’s different in this group**","## **Safety notes**"] },
  { slug: "prognosis", title: "Prognosis / will it come back?", triggers: [
      "prognosis", "will it come back", "recurrence", "chances it returns"
    ], outline: ["## **What to expect**","## **Lower the chance it returns**"] },
  { slug: "prevention", title: "Prevention / reduce risk", triggers: [
      "prevent", "prevention", "avoid getting it", "lower my risk"
    ], outline: ["## **Daily habits**","## **When prevention isn’t enough**"] },
  { slug: "monitoring_home", title: "Monitor at home / tracker", triggers: [
      "monitor at home", "diary", "log", "tracker", "symptom diary", "home monitoring"
    ], outline: ["## **What to track**","## **When to seek care**"] },
  { slug: "cost", title: "Cost/insurance", triggers: [
      "cost", "insurance", "covered", "generic", "brand", "cheaper option", "affordable"
    ], outline: ["## **Lower-cost options**","## **What to ask insurance**"] },
  { slug: "second_opinion", title: "Second opinion / what to ask", triggers: [
      "second opinion", "what to ask my doctor", "questions to ask"
    ], outline: ["## **Key questions to ask**","## **How to prepare**"] },
  { slug: "compare_dx", title: "Compare diagnoses", triggers: [
      "compare diagnoses", "difference between * and *", "how to tell if it is * or *", "* vs * diagnosis"
    ], outline: ["## **How they differ**","## **When to see a doctor**"] },
  { slug: "compare_tx", title: "Compare treatments", triggers: [
      "compare treatments", "ibuprofen vs acetaminophen", "which is better * or *", "* vs * treatment"
    ], outline: ["## **Pros & cons**","## **Which to prefer when**"] },
  { slug: "contagious", title: "Is it contagious?", triggers: [
      "is it contagious", "protect family", "spread to others"
    ], outline: ["## **Is it contagious?**","## **How to protect others**"] },
  { slug: "caregiver", title: "Caregiver guidance", triggers: [
      "caregiver", "how to help someone", "family support"
    ], outline: ["## **How to help**","## **What to watch for**"] },
  { slug: "vaccines", title: "Vaccines", triggers: [
      "vaccine", "vaccination", "immunization"
    ], outline: ["## **Relevant vaccines**","## **Timing / eligibility**"] },
  { slug: "safety_home", title: "Safety at home", triggers: [
      "safety at home", "falls", "driving safety", "home safety"
    ], outline: ["## **Make home safer**","## **When to stop and seek help**"] },
  { slug: "post_procedure", title: "After test/procedure care", triggers: [
      "post procedure", "after surgery", "care after", "wound care", "bandage care", "cast care", "splint care", "brace care"
    ], outline: ["## **At-home care**","## **When to call your doctor**"] },
  { slug: "prepare_procedure", title: "Prepare for procedure", triggers: [
      "prepare for procedure", "before surgery", "before test", "fasting", "hold medications"
    ], outline: ["## **How to prepare**","## **What to bring/expect**"] },
  { slug: "alt_therapies", title: "Alternative/adjunct therapies", triggers: [
      "alternative", "complementary", "acupuncture", "yoga", "massage", "chiropractic"
    ], outline: ["## **What may help**","## **What to avoid**"] },
];

// ---------------- Doctor intents (broad coverage) ----------------

const DOCTOR_SPECS: IntentSpec[] = [
  // Foundations
  { slug: "definition", title: "Definition (clinical)", triggers: ["definition", "clinical definition", "^define\\b"], outline: ["## **Definition (clinical)**","## **Phenotypes**"] },
  { slug: "epidemiology", title: "Epidemiology / risk factors", triggers: ["epidemiology", "burden", "risk factors"], outline: ["## **Epidemiology / risk factors**","## **Who to screen / suspect**"] },
  { slug: "pathophysiology", title: "Pathophysiology / mechanism", triggers: ["pathophysiology", "pathogenesis", "mechanism"], outline: ["## **Mechanism / pathophysiology**","## **Clinical implications**"] },
  { slug: "natural_history", title: "Natural history / prognosis", triggers: ["natural history", "prognosis"], outline: ["## **Natural history**","## **Prognostic factors**"] },
  { slug: "phenotypes", title: "Phenotypes/subtypes", triggers: ["phenotypes", "subtypes", "endotypes"], outline: ["## **Phenotypes/subtypes**","## **How they differ (dx/tx)**"] },
  { slug: "criteria", title: "Diagnostic/Classification criteria", triggers: ["diagnostic criteria", "classification criteria", "severity", "staging"], outline: ["## **Diagnostic criteria**","## **Severity / staging**"] },
  { slug: "red_flags", title: "Red flags / don't miss", triggers: ["red flags", "don't miss", "dont miss", "danger signs"], outline: ["## **Red flags**","## **Immediate actions / escalation**"] },
  { slug: "ddx", title: "Differential diagnosis", triggers: ["differential", "^ddx\\b"], outline: ["## **Differential diagnosis**","## **Rule-in / rule-out features**"] },

  // Work-up / testing / imaging
  { slug: "workup", title: "Initial work-up", triggers: ["initial work up", "initial work-up", "assessment", "evaluation", "tests", "^work[-\\s]*up\\b"], outline: ["## **Initial work-up** (H&P, labs, imaging)","## **When to image / stewardship**"] },
  { slug: "imaging", title: "Imaging choice", triggers: ["imaging", "xray", "x-ray", "ct", "mri", "ultrasound"], outline: ["## **Imaging choice (indications)**","## **Avoid imaging when …**"] },
  { slug: "test_characteristics", title: "Test characteristics", triggers: ["sensitivity", "specificity", "likelihood ratio", "likelihood ratios", "cutoff", "cut-offs", "thresholds"], outline: ["## **Test characteristics**","## **Clinical use / limits**"] },
  { slug: "scores", title: "Risk scores / calculators", triggers: ["score", "calculator", "risk score", "wells", "ottawa", "frax"], outline: ["## **Risk stratification / scores**","## **How it changes management**"] },
  { slug: "interpretation", title: "Interpretation (lab/imaging)", triggers: ["lab interpretation", "imaging interpretation", "findings", "reading", "meaning"], outline: ["## **Interpretation**","## **Next steps**"] },

  // Management
  { slug: "algorithm", title: "Management algorithm", triggers: ["first line", "first-line", "management", "algorithm", "step-up", "step down", "step-down"], outline: ["## **First-line management**","## **Step-up / referral**"] },
  { slug: "dosing", title: "Dosing / adjustments", triggers: ["dose", "dosing", "posology", "mg", "renal", "hepatic", "adjustments"], outline: ["## **Dosing** (adult/peds; renal/hepatic)","## **Monitoring / cautions**"] },
  { slug: "contra_interactions", title: "Contraindications / interactions", triggers: ["contraindication", "contraindications", "interactions", "black box"], outline: ["## **Contraindications / major interactions**","## **Risk mitigation**"] },
  { slug: "adverse_monitoring", title: "Adverse effects / monitoring", triggers: ["adverse effects", "side effects", "toxicity", "monitoring"], outline: ["## **Adverse effects / monitoring**","## **When to stop / switch**"] },
  { slug: "deprescribing", title: "Deprescribing", triggers: ["deprescribe", "deprescribing", "taper"], outline: ["## **Deprescribing approach**","## **Follow-up & safety**"] },
  { slug: "non_pharm", title: "Non-pharmacologic", triggers: ["non pharm", "non-pharm", "physical therapy", "rehab", "brace", "ergonomics"], outline: ["## **Non-pharmacologic**","## **Progression / criteria**"] },
  { slug: "procedure", title: "Procedure indications/technique", triggers: ["procedure", "injection", "block", "technique", "indications"], outline: ["## **Indications / selection**","## **Technique / aftercare**"] },
  { slug: "peri_procedural", title: "Peri-procedural", triggers: ["peri op", "peri-op", "perioperative", "anticoagulation", "steroids"], outline: ["## **Peri-procedural plan**","## **Hold/bridge/adjust meds**"] },
  { slug: "antibiotic", title: "Antibiotics / micro", triggers: ["antibiotic", "abx", "micro", "culture", "antibiogram"], outline: ["## **Likely pathogens / setting**","## **Empiric / targeted options**"] },
  { slug: "special_populations", title: "Special populations", triggers: ["pregnancy", "peds", "geriatrics", "ckd", "cirrhosis", "copd", "cad", "immunosuppressed"], outline: ["## **Special populations**","## **Adjustments / cautions**"] },
  { slug: "follow_up", title: "Follow-up & monitoring", triggers: ["follow up", "follow-up", "monitoring", "intervals"], outline: ["## **Monitoring & intervals**","## **Triggers to escalate**"] },
  { slug: "escalate", title: "Escalation / admission", triggers: ["admit", "escalate", "icu", "unstable"], outline: ["## **When to escalate / admit**","## **Immediate stabilization**"] },

  // Evidence / documentation / ops
  { slug: "guidelines", title: "Guidelines / evidence", triggers: ["guideline", "nice", "acp", "aan", "who", "evidence", "meta analysis", "meta-analysis", "rct"], outline: ["## **Guideline/evidence highlights**","## **Where evidence is weak**"] },
  { slug: "nnt_nnh", title: "NNT/NNH / pitfalls", triggers: ["nnt", "nnh", "effect size", "controversy", "controversies", "pitfalls", "pearls"], outline: ["## **Benefit/harms (NNT/NNH)**","## **Pitfalls & uncertainties**"] },
  { slug: "documentation", title: "Documentation template", triggers: ["soap", "hpi", "assessment & plan", "a/p", "template"], outline: ["## **Documentation template**","## **Billing drivers / coding hints**"] },
  { slug: "codes", title: "ICD-10 / CPT / prior auth", triggers: ["icd 10", "icd-10", "cpt", "prior auth", "medical necessity"], outline: ["## **Codes / phrasing**","## **Key criteria to include**"] },
  { slug: "discharge", title: "Discharge / return precautions", triggers: ["discharge", "return precautions", "safety net", "education"], outline: ["## **Discharge instructions**","## **Safety net / return precautions**"] },
  { slug: "telemedicine", title: "Telemedicine", triggers: ["telemedicine", "virtual", "remote"], outline: ["## **What’s safe via telemedicine**","## **When in-person is required**"] },

  // Advanced
  { slug: "edge_cases", title: "Edge cases / refractory", triggers: ["atypical", "refractory", "failure", "contraindicated", "rare", "complication"], outline: ["## **Edge cases**","## **Next steps / consultation**"] },
  { slug: "pop_specific", title: "Population-specific", triggers: ["lactation", "pediatric", "geriatric", "renal", "hepatic", "immunosuppression"], outline: ["## **Population-specific considerations**","## **Dose/choice adjustments**"] },
];

// ---------------- Engine (Public API) ----------------

const P = compile(PATIENT_SPECS);
const D = compile(DOCTOR_SPECS);

/** Return top matches (up to N=5) with simple coverage scores */
export function classifyIntent(userText: string, mode: Mode, topN = 5): Match[] {
  const s = normalize(userText);
  const pool = mode === "doctor" ? D : P;
  const scored = pool
    .map((spec) => ({ slug: spec.slug, score: score(s, spec) }))
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
  return scored;
}

/** Return a markdown structure block appropriate for this user text and mode */
export function getIntentStyle(userText: string, mode: Mode): string {
  const s = normalize(userText);
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

/** Utility: get default drafting style */
export function defaultDraftStyle(mode: Mode): string {
  return mode === "doctor" ? DOCTOR_DRAFT_STYLE : PATIENT_DRAFT_STYLE;
}

/** Utility: list all intent slugs and titles (for chips/UI) */
export function listIntents(mode: Mode): { slug: string; title: string }[] {
  const pool = mode === "doctor" ? DOCTOR_SPECS : PATIENT_SPECS;
  return pool.map(({ slug, title }) => ({ slug, title }));
}

export default {
  getIntentStyle,
  classifyIntent,
  defaultDraftStyle,
  listIntents,
  PATIENT_DRAFT_STYLE,
  DOCTOR_DRAFT_STYLE,
};
