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
  | "meded";

export function indexAnswer(text: string) {
  const tags: AnswerTag[] = [];
  const lower = text.toLowerCase();
  if (/\=|∫|∂|√|\btheorem|lemma|proof\b/i.test(lower)) tags.push("math");
  if (/\bempire|dynasty|treaty|revolution|war|reign|century\b/i.test(lower)) tags.push("history");
  // lower = answer text lowercased
  if (/\bclinical psychology|cbt|dbt|mi\b/.test(lower)) tags.push("clinpsych", "behavmed");
  if (/\bbehavioral medicine|addiction|relapse prevention\b/.test(lower)) tags.push("behavmed");
  if (/\bcognitive neuroscience|executive function|working memory|neurorehab\b/.test(lower)) tags.push("cogneuro");
  if (/\bhealth coaching|motivational interviewing|adherence\b/.test(lower)) tags.push("healthcoaching");

  if (/\benvironmental health|air quality|pollution|toxicology\b/.test(lower)) tags.push("envhealth");
  if (/\boccupational medicine|ergonomics|repetitive strain\b/.test(lower)) tags.push("occupational");
  if (/\baerospace medicine|high altitude|g force|flight surgeon\b/.test(lower)) tags.push("aerospace");
  if (/\bhyperbaric|decompression sickness|diving medicine\b/.test(lower)) tags.push("hyperbaric");

  if (/\bbiomedical engineering|implant|sensor|prosthetic|device integration\b/.test(lower)) tags.push("biomed");
  if (/\behr|telemedicine|digital therapeutics|informatics\b/.test(lower)) tags.push("healthit");
  if (/\bbioinformatics|proteomics|sequence alignment|systems biology\b/.test(lower)) tags.push("bioinformatics", "compbio");
  if (/\bbiostatistics|survival analysis|cox|kaplan\-meier\b/.test(lower)) tags.push("biostats");
  if (/\bepidemiolog(y|ic(al)?) modeling|seir|r0|r_t\b/.test(lower)) tags.push("epi-modeling");
  if (/\bai ethics|fairness|explainability|bias detection\b/.test(lower)) tags.push("ai-ethics");

  if (/\bgenetics|genome|variant|snv|cnv\b/.test(lower)) tags.push("genetics");
  if (/\bepigenetic|methylation|chromatin\b/.test(lower)) tags.push("epigenetics");
  if (/\bpharmacogenomic|cyp2d6|cyp2c19|hlar\b/.test(lower)) tags.push("pharmacogenomics");
  if (/\bmolecular diagnostics|liquid biopsy|crispr test\b/.test(lower)) tags.push("mol-diagnostics");

  if (/\bsleep medicine|insomnia|apnea|chronotype\b/.test(lower)) tags.push("sleep");
  if (/\bchronobiology|circadian|zeitgeber\b/.test(lower)) tags.push("chronobiology");
  if (/\blifestyle medicine|diet|exercise|stress management\b/.test(lower)) tags.push("lifestyle");
  if (/\bintegrative medicine|complementary|acupuncture|ayurveda|mindfulness\b/.test(lower)) tags.push("integrative", "complementary");

  if (/\bglobal health|pandemic|cross\-border|travel advisory\b/.test(lower)) tags.push("globalhealth");
  if (/\bhealth economics|cost\-effectiveness|qaly|hta|payer\b/.test(lower)) tags.push("healthecon", "policy");
  if (/\bpolicy|regulatory impact|reimbursement\b/.test(lower)) tags.push("policy");
  if (/\bmedical education|curriculum|adaptive learning|cds\b/.test(lower)) tags.push("meded");
  if (!tags.length) tags.push("general");
  return tags;
}
