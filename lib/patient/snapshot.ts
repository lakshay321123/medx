export async function buildPatientSnapshot(thread_id: string) {
  // TODO: Merge memory + recent messages + uploaded docs.
  // Temporary stub for your Rohan demo:
  return {
    name: "Rohan",
    age: 45,
    sex: "Male",
    encounterDate: new Date().toISOString().slice(0,10),
    diagnoses: ["acute myeloid leukemia (stage 4)"],
    comorbidities: ["asthma", "hepatomegaly", "renal dysfunction"],
    meds: ["cytarabine", "beclometasone inhaled"],
    labs: [
      { name: "creatinine", value: 2.1, unit: "mg/dL" },
      { name: "alt", value: 80, unit: "U/L" },
      { name: "bilirubin total", value: 2.0, unit: "mg/dL" },
      { name: "hemoglobin", value: 8, unit: "g/dL" },
    ],
    allergies: ["penicillin"],
  };
}
