export type AnswerTag =
  | "allied" | "paramedic" | "nursing" | "physiotherapy" | "ot" | "speech"
  | "respiratory" | "wellness" | "nutrition" | "fitness" | "sportsmed" | "sleep"
  | "mentalhealth" | "lifestyle" | "altmed"
  | "chem" | "biochem" | "pharmacology" | "toxicology" | "genomics" | "microbiology" | "virology"
  | "envhealth" | "biomed" | "biostats" | "epi" | "ai-data"
  | "psychiatry" | "addiction" | "sexual" | "mindfulness" | "publichealth"
  | "dental" | "derm" | "occupational" | "travel" | "forensic" | "healthecon"
  | "healthit" | "regulatory" | "edresearch" | "telemedicine"
  | string;

export function indexAnswer(content: string): AnswerTag[] {
  const lower = content.toLowerCase();
  const tags: AnswerTag[] = [];

  if (/\bnurse|nursing|np\b/.test(lower)) tags.push("nursing", "allied");
  if (/\bparamedic|first responder|trauma|emt\b/.test(lower)) tags.push("paramedic", "allied");
  if (/\bphysio|physiotherapy|rehab\b/.test(lower)) tags.push("physiotherapy", "allied");
  if (/\boccupational therapy|ergonomic|adl\b/.test(lower)) tags.push("ot", "allied");
  if (/\bspeech therapy|aphasia|dysphagia|slp\b/.test(lower)) tags.push("speech", "allied");
  if (/\brespiratory therapy|ventilator|copd\b/.test(lower)) tags.push("respiratory", "allied");

  if (/\bnutrition|dietitian|meal plan|macro\b/.test(lower)) tags.push("nutrition", "wellness");
  if (/\bfitness|exercise|strength|mobility\b/.test(lower)) tags.push("fitness", "wellness");
  if (/\bsports medicine|acl|rotator cuff|return to play\b/.test(lower)) tags.push("sportsmed", "wellness");
  if (/\bsleep|insomnia|apnea|sleep hygiene\b/.test(lower)) tags.push("sleep", "wellness");
  if (/\bcbt|counselor|psychologist|anxiety|depression\b/.test(lower)) tags.push("mentalhealth", "wellness");
  if (/\blifestyle medicine|habit|behavior change\b/.test(lower)) tags.push("lifestyle", "wellness");
  if (/\bayurveda|tcm|naturopathy|acupuncture\b/.test(lower)) tags.push("altmed", "wellness");

  if (/\bpharmacology|dose|interaction|side effect\b/.test(lower)) tags.push("pharmacology");
  if (/\btoxicology|overdose|poison\b/.test(lower)) tags.push("toxicology");
  if (/\bchemistry|biochemistry|metabolite\b/.test(lower)) tags.push("chem", "biochem");
  if (/\bgenomic|crisper|mutation|variant\b/.test(lower)) tags.push("genomics");
  if (/\bmicrobiolog|bacteria|antibiotic\b/.test(lower)) tags.push("microbiology");
  if (/\bvirology|virus|viral load\b/.test(lower)) tags.push("virology");
  if (/\benvironmental health|pollution|occupational hazard\b/.test(lower)) tags.push("envhealth");
  if (/\bbiomedical engineer|device|prosthetic|wearable\b/.test(lower)) tags.push("biomed");
  if (/\bbiostat|survival|cox|p value\b/.test(lower)) tags.push("biostats");
  if (/\bepidemiolog|incidence|prevalence|rr|or\b/.test(lower)) tags.push("epi");
  if (/\bmachine learning|ai|model|auc|roc|cnn\b/.test(lower)) tags.push("ai-data");

  if (/\bpsychiatry|mood|psychosis|antipsychotic\b/.test(lower)) tags.push("psychiatry");
  if (/\baddiction|substance use|rehab center\b/.test(lower)) tags.push("addiction");
  if (/\bsexual health|sti|contraception\b/.test(lower)) tags.push("sexual");
  if (/\bmindful|meditation|breathing\b/.test(lower)) tags.push("mindfulness");
  if (/\bpublic health|vaccination|screening program\b/.test(lower)) tags.push("publichealth");

  if (/\bdentist|oral surgery|periodontal\b/.test(lower)) tags.push("dental");
  if (/\bdermatology|acne|aesthetic|cosmetic\b/.test(lower)) tags.push("derm");
  if (/\boccupational health|fit test|ergonomics\b/.test(lower)) tags.push("occupational");
  if (/\btravel medicine|vaccine certificate|malaria prophylaxis\b/.test(lower)) tags.push("travel");
  if (/\bforensic|medicolegal|toxicology report\b/.test(lower)) tags.push("forensic");
  if (/\bhealth economics|cost-effectiveness|qaly|hta\b/.test(lower)) tags.push("healthecon");

  if (/\behr|hl7|fhir|dicom|interop\b/.test(lower)) tags.push("healthit");
  if (/\bhipaa|gdpr|compliance|regulatory\b/.test(lower)) tags.push("regulatory");
  if (/\bmedical education|curriculum|residency\b/.test(lower)) tags.push("edresearch");
  if (/\btelemedicine|remote care|virtual visit\b/.test(lower)) tags.push("telemedicine");

  return Array.from(new Set(tags));
}
