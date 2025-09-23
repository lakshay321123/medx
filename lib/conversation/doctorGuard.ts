// Clinical Mode Guard — strips research and enforces structure
export function enforceDoctorMode(output: string, template: string): string {
  let cleaned = output;

  // 1. Remove research/trial chatter
  cleaned = cleaned.replace(/.*\b(trial|study|research|pubmed|clinicaltrials\.gov|NCI|ICTRP|registry)\b.*\n?/gi, "");

  // 2. Remove references/links
  cleaned = cleaned.replace(/\[\d+\]\s?.*\n?/g, "");
  cleaned = cleaned.replace(/https?:\/\/\S+/g, "");

  // 3. Remove "References" section if present
  cleaned = cleaned.replace(/##?\s*References[\s\S]*/gi, "");

  // 4. Enforce mandatory headings — if missing, inject from template
  const mustHave = [
    "**Demographics**",
    "**Diagnoses**",
    "**Comorbidities**",
    "**Medications**",
    "**Labs**",
    "**Clinical Implications**",
    "**Management Options**",
    "**Supportive / Palliative Measures**",
    "**Red Flags**"
  ];
  for (const h of mustHave) {
    if (!cleaned.includes(h)) {
      cleaned += `\n\n${h}\n- [Not documented in model output]`;
    }
  }

  // 5. Remove casual/lifestyle filler
  cleaned = cleaned.replace(/(balanced diet|rest and relaxation|stress-reducing|fruits, vegetables|exercise)/gi, "");

  // Final polish
  return cleaned.trim();
}

