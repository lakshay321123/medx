export type Symptom = "fever" | "headache" | "heartburn" | "allergy_rhinitis";
const map: Record<Symptom, string[]> = {
  fever: ["paracetamol"],
  headache: ["paracetamol"],
  heartburn: [],
  allergy_rhinitis: []
};
export function otcOptionsFor(symptom: Symptom) {
  return map[symptom] ?? [];
}
