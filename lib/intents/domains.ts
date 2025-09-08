export type DomainKind =
  | "allied" | "wellness" | "technical" | "behavioral" | "supportive" | "compliance" | null;

export function detectDomain(text: string): DomainKind {
  const s = text.toLowerCase();
  if (/\bnurse|nursing|paramedic|physio|occupational therapy|speech therapy|respiratory therapy|rehab\b/.test(s)) return "allied";
  if (/\bnutrition|diet|meal plan|fitness|workout|sports medicine|sleep|insomnia|apnea|lifestyle|ayurveda|tcm|naturopathy\b/.test(s)) return "wellness";
  if (/\bchemistry|biochemistry|pharmacology|toxicology|genomics|microbiology|virology|molar mass|stoichiometry|experiment|assay\b/.test(s)) return "technical";
  if (/\bpsychology|psychiatry|cbt|addiction|substance use|sexual health|mindfulness|public health\b/.test(s)) return "behavioral";
  if (/\bdental|dermatology|occupational health|travel medicine|forensic|economics|qaly|hta\b/.test(s)) return "supportive";
  if (/\behr|fhir|dicom|interoperability|hipaa|gdpr|compliance|telemedicine|virtual care|hl7\b/.test(s)) return "compliance";
  return null;
}
