export function redflagChecks(input: {
  vitals?: { sbp?: number; hr?: number; spo2?: number; temp?: number };
  symptomsText?: string;
}) {
  const alerts: string[] = [];

  const v = input.vitals ?? {};
  if (v.sbp !== undefined && v.sbp < 90) alerts.push("Low blood pressure (SBP < 90) → urgent care.");
  if (v.hr !== undefined && v.hr > 120) alerts.push("Very high heart rate (>120) → urgent evaluation.");
  if (v.spo2 !== undefined && v.spo2 < 92) alerts.push("Low oxygen saturation (<92%) → urgent evaluation.");
  if (v.temp !== undefined && v.temp >= 39.4) alerts.push("High fever (≥39.4°C).");

  const s = (input.symptomsText || "").toLowerCase();
  if (/(chest pain( at rest)?|pressure)/.test(s)) alerts.push("Chest pain → rule out ACS; seek care.");
  if (/(one-sided|focal|weakness|slurred speech|face droop)/.test(s)) alerts.push("Neurologic deficit → stroke warning; urgent care.");
  if (/(black stools|vomit.*blood|cough.*blood)/.test(s)) alerts.push("Possible bleeding → urgent evaluation.");
  return alerts;
}
