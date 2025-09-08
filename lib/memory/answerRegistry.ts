export type AnswerTag =
  | "general"
  | "math"
  | "history"
  | "behavmed"
  | "clinpsych"
  | "cogneuro"
  | "healthcoaching"
  | "envhealth"
  | "occupational"
  | "aerospace"
  | "hyperbaric"
  | "biomed"
  | "healthit"
  | "bioinformatics"
  | "compbio"
  | "biostats"
  | "epi-modeling"
  | "ai-ethics"
  | "genetics"
  | "epigenetics"
  | "pharmacogenomics"
  | "mol-diagnostics"
  | "sleep"
  | "chronobiology"
  | "lifestyle"
  | "integrative"
  | "complementary"
  | "globalhealth"
  | "healthecon"
  | "policy"
  | "meded"
  | "allied" | "paramedic" | "nursing" | "physiotherapy" | "ot" | "speech"
  | "respiratory" | "wellness" | "nutrition" | "fitness" | "sportsmed" | "sleep"
  | "mentalhealth" | "lifestyle" | "altmed"
  | "chem" | "biochem" | "pharmacology" | "toxicology" | "genomics" | "microbiology" | "virology"
  | "envhealth" | "biomed" | "biostats" | "epi" | "ai-data"
  | "psychiatry" | "addiction" | "sexual" | "mindfulness" | "publichealth"
  | "dental" | "derm" | "occupational" | "travel" | "forensic" | "healthecon"
  | "healthit" | "regulatory" | "edresearch" | "telemedicine";

// === ADD-ONLY: small helpers to keep merges safe ===
function pushTag(set: Set<string>, ...vals: string[]) {
  for (const v of vals) if (v) set.add(v);
}

export function indexAnswer(text: string) {
  const lower = text.toLowerCase();
  const out = new Set<string>();
  if (/\=|∫|∂|√|\btheorem|lemma|proof\b/i.test(lower)) pushTag(out, "math");
  if (/\bempire|dynasty|treaty|revolution|war|reign|century\b/i.test(lower)) pushTag(out, "history");
  // lower = answer text lowercased
  if (/\bclinical psychology|cbt|dbt|mi\b/.test(lower)) pushTag(out, "clinpsych", "behavmed");
  if (/\bbehavioral medicine|addiction|relapse prevention\b/.test(lower)) pushTag(out, "behavmed");
  if (/\bcognitive neuroscience|executive function|working memory|neurorehab\b/.test(lower)) pushTag(out, "cogneuro");
  if (/\bhealth coaching|motivational interviewing|adherence\b/.test(lower)) pushTag(out, "healthcoaching");

  if (/\benvironmental health|air quality|pollution|toxicology\b/.test(lower)) pushTag(out, "envhealth");
  if (/\boccupational medicine|ergonomics|repetitive strain\b/.test(lower)) pushTag(out, "occupational");
  if (/\baerospace medicine|high altitude|g force|flight surgeon\b/.test(lower)) pushTag(out, "aerospace");
  if (/\bhyperbaric|decompression sickness|diving medicine\b/.test(lower)) pushTag(out, "hyperbaric");

  if (/\bbiomedical engineering|implant|sensor|prosthetic|device integration\b/.test(lower)) pushTag(out, "biomed");
  if (/\behr|telemedicine|digital therapeutics|informatics\b/.test(lower)) pushTag(out, "healthit");
  if (/\bbioinformatics|proteomics|sequence alignment|systems biology\b/.test(lower)) pushTag(out, "bioinformatics", "compbio");
  if (/\bbiostatistics|survival analysis|cox|kaplan\-meier\b/.test(lower)) pushTag(out, "biostats");
  if (/\bepidemiolog(y|ic(al)?) modeling|seir|r0|r_t\b/.test(lower)) pushTag(out, "epi-modeling");
  if (/\bai ethics|fairness|explainability|bias detection\b/.test(lower)) pushTag(out, "ai-ethics");

  if (/\bgenetics|genome|variant|snv|cnv\b/.test(lower)) pushTag(out, "genetics");
  if (/\bepigenetic|methylation|chromatin\b/.test(lower)) pushTag(out, "epigenetics");
  if (/\bpharmacogenomic|cyp2d6|cyp2c19|hlar\b/.test(lower)) pushTag(out, "pharmacogenomics");
  if (/\bmolecular diagnostics|liquid biopsy|crispr test\b/.test(lower)) pushTag(out, "mol-diagnostics");

  if (/\bsleep medicine|insomnia|apnea|chronotype\b/.test(lower)) pushTag(out, "sleep");
  if (/\bchronobiology|circadian|zeitgeber\b/.test(lower)) pushTag(out, "chronobiology");
  if (/\blifestyle medicine|diet|exercise|stress management\b/.test(lower)) pushTag(out, "lifestyle");
  if (/\bintegrative medicine|complementary|acupuncture|ayurveda|mindfulness\b/.test(lower)) pushTag(out, "integrative", "complementary");

  if (/\bglobal health|pandemic|cross\-border|travel advisory\b/.test(lower)) pushTag(out, "globalhealth");
  if (/\bhealth economics|cost\-effectiveness|qaly|hta|payer\b/.test(lower)) pushTag(out, "healthecon", "policy");
  if (/\bpolicy|regulatory impact|reimbursement\b/.test(lower)) pushTag(out, "policy");
  if (/\bmedical education|curriculum|adaptive learning|cds\b/.test(lower)) pushTag(out, "meded");

  // === ADD-ONLY: Allied / Wellness ===
  if (/\bnurse|nursing|np\b/.test(lower)) pushTag(out, "nursing", "allied");
  if (/\bparamedic|first responder|trauma|emt\b/.test(lower)) pushTag(out, "paramedic", "allied");
  if (/\bphysio|physiotherapy|rehab\b/.test(lower)) pushTag(out, "physiotherapy", "allied");
  if (/\boccupational therapy|ergonomic|adl\b/.test(lower)) pushTag(out, "ot", "allied");
  if (/\bspeech therapy|aphasia|dysphagia|slp\b/.test(lower)) pushTag(out, "speech", "allied");
  if (/\brespiratory therapy|ventilator|copd\b/.test(lower)) pushTag(out, "respiratory", "allied");

  if (/\bnutrition|dietitian|meal plan|macro\b/.test(lower)) pushTag(out, "nutrition", "wellness");
  if (/\bfitness|exercise|strength|mobility\b/.test(lower)) pushTag(out, "fitness", "wellness");
  if (/\bsports medicine|rotator cuff|return to play\b/.test(lower)) pushTag(out, "sportsmed", "wellness");
  if (/\bsleep|insomnia|apnea|sleep hygiene\b/.test(lower)) pushTag(out, "sleep", "wellness");
  if (/\bcbt|counselor|psychologist|anxiety|depression\b/.test(lower)) pushTag(out, "mentalhealth", "wellness");
  if (/\blifestyle medicine|habit|behavior change\b/.test(lower)) pushTag(out, "lifestyle", "wellness");
  if (/\bayurveda|tcm|naturopathy|acupuncture\b/.test(lower)) pushTag(out, "altmed", "wellness");

  // === ADD-ONLY: Technical sciences ===
  if (/\bpharmacology|dose|interaction|side effect\b/.test(lower)) pushTag(out, "pharmacology");
  if (/\btoxicology|overdose|poison\b/.test(lower)) pushTag(out, "toxicology");
  if (/\bchemistry|biochemistry|metabolite\b/.test(lower)) pushTag(out, "chem", "biochem");
  if (/\bgenomic|crispr|mutation|variant\b/.test(lower)) pushTag(out, "genomics");
  if (/\bmicrobiolog|bacteria|antibiotic\b/.test(lower)) pushTag(out, "microbiology");
  if (/\bvirology|virus|viral load\b/.test(lower)) pushTag(out, "virology");
  if (/\benvironmental health|pollution|occupational hazard\b/.test(lower)) pushTag(out, "envhealth");
  if (/\bbiomedical engineer|device|prosthetic|wearable\b/.test(lower)) pushTag(out, "biomed");
  if (/\bbiostat|survival|cox|p[- ]?value\b/.test(lower)) pushTag(out, "biostats");
  if (/\bepidemiolog|incidence|prevalence|\b(rr|or)\b\b/.test(lower)) pushTag(out, "epi");
  if (/\bmachine learning|ai|model|auc|roc|cnn\b/.test(lower)) pushTag(out, "ai-data");

  // === ADD-ONLY: Behavioral & public health ===
  if (/\bpsychiatry|psychosis|antipsychotic\b/.test(lower)) pushTag(out, "psychiatry");
  if (/\baddiction|substance use|rehab center\b/.test(lower)) pushTag(out, "addiction");
  if (/\bsexual health|sti|contraception\b/.test(lower)) pushTag(out, "sexual");
  if (/\bmindful|meditation|breathing\b/.test(lower)) pushTag(out, "mindfulness");
  if (/\bpublic health|vaccination|screening program\b/.test(lower)) pushTag(out, "publichealth");

  // === ADD-ONLY: Supportive / adjacent specialties ===
  if (/\bdentist|oral surgery|periodontal\b/.test(lower)) pushTag(out, "dental");
  if (/\bdermatology|acne|aesthetic|cosmetic\b/.test(lower)) pushTag(out, "derm");
  if (/\boccupational health|ergonomics|fit test\b/.test(lower)) pushTag(out, "occupational");
  if (/\btravel medicine|yellow fever|malaria prophylaxis\b/.test(lower)) pushTag(out, "travel");
  if (/\bforensic|medicolegal|toxicology report\b/.test(lower)) pushTag(out, "forensic");
  if (/\bhealth economics|cost[- ]?effectiveness|qaly|hta\b/.test(lower)) pushTag(out, "healthecon");

  // === ADD-ONLY: Tech + compliance ===
  if (/\behr|hl7|fhir|dicom|interop\b/.test(lower)) pushTag(out, "healthit");
  if (/\bhipaa|gdpr|compliance|regulatory\b/.test(lower)) pushTag(out, "regulatory");
  if (/\bmedical education|curriculum|residency\b/.test(lower)) pushTag(out, "edresearch");
  if (/\btelemedicine|remote care|virtual visit\b/.test(lower)) pushTag(out, "telemedicine");

  if (!out.size) pushTag(out, "general");
  return Array.from(out) as AnswerTag[];
}
