
// lib/medical/engine/calculators/killip_kimball.ts
// Killip class for AMI: I (no HF), II (S3/rales/JVP), III (pulmonary edema), IV (cardiogenic shock).

export interface KillipInput {
  s3_present?: boolean | null;
  rales_more_than_half_lungs?: boolean | null;
  pulmonary_edema?: boolean | null;
  jvp_elevated?: boolean | null;
  cardiogenic_shock?: boolean | null; // hypotension + hypoperfusion clinical
}

export type KillipClass = 1 | 2 | 3 | 4;

export interface KillipOutput { killip_class: KillipClass; rationale: string[]; }

export function runKillip(i: KillipInput): KillipOutput {
  const reasons: string[] = [];
  if (i.cardiogenic_shock) {
    reasons.push("Cardiogenic shock");
    return { killip_class: 4, rationale: reasons };
  }
  if (i.pulmonary_edema || i.rales_more_than_half_lungs) {
    reasons.push("Pulmonary edema / diffuse rales");
    return { killip_class: 3, rationale: reasons };
  }
  if (i.s3_present || i.jvp_elevated) {
    if (i.s3_present) reasons.push("S3 gallop");
    if (i.jvp_elevated) reasons.push("Elevated JVP");
    return { killip_class: 2, rationale: reasons };
  }
  reasons.push("No signs of heart failure");
  return { killip_class: 1, rationale: reasons };
}
