export function doctorSafetyNotes(patient: any): string[] {
  const notes: string[] = [];
  const labs = patient?.labs || [];
  const get = (name: string) => labs.find((l: any) => l.name.toLowerCase() === name);

  const cr = get("creatinine");
  if (cr && Number(cr.value) >= 2) {
    notes.push("Renal impairment likely — consider dose adjustments and avoid nephrotoxins.");
  }
  const alt = get("alt");
  if (alt && Number(alt.value) > 55) {
    notes.push("Hepatic enzyme elevation — avoid hepatotoxic agents; adjust anthracyclines.");
  }
  if ((patient?.comorbidities || []).some((c: string) => /asthma/i.test(c))) {
    notes.push("Asthma — review inhaler optimization; avoid bronchoconstrictive agents.");
  }
  return notes;
}
