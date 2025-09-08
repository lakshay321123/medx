export type AdvancedDomain =
  | "behav-med"
  | "env-occ"
  | "data-tech"
  | "genomics"
  | "preventive"
  | "systems-policy"
  | null;

export function detectAdvancedDomain(text: string): AdvancedDomain {
  const s = text.toLowerCase();

  if (/\bclinical psychology|behavioral medicine|cognitive neuroscience|neurocognitive|health coaching|adherence\b/.test(s))
    return "behav-med";

  if (/\benvironmental health|pollution|toxicology|occupational|ergonomic|aerospace|hyperbaric|diving\b/.test(s))
    return "env-occ";

  if (/\bbiomedical engineering|implant|sensor|informatics|ehr|telemedicine|digital therapeutics|bioinformatics|proteomics|biostatistics|epidemiolog.*model|ai ethics|explainability|fairness\b/.test(s))
    return "data-tech";

  if (/\bgenetic|epigenetic|pharmacogenomic|molecular diagnostic|liquid biopsy|crispr\b/.test(s))
    return "genomics";

  if (/\bsleep|chronobiology|circadian|lifestyle medicine|diet|exercise|integrative|complementary|ayurveda|acupuncture|mindfulness\b/.test(s))
    return "preventive";

  if (/\bglobal health|pandemic|health economics|policy|qaly|hta|medical education|adaptive learning|clinical decision support\b/.test(s))
    return "systems-policy";

  return null;
}

