// lib/medical/engine/calculators/maddrey_df.ts
export interface MaddreyInput {
  pt_patient_sec?: number | null;
  pt_control_sec?: number | null;
  bilirubin_mg_dl?: number | null;
}
export interface MaddreyOutput { df: number; severe: boolean; }

export function runMaddreyDF(i: MaddreyInput): MaddreyOutput {
  if (i.pt_patient_sec == null || i.pt_control_sec == null || i.bilirubin_mg_dl == null) {
    return { df: NaN, severe: false };
  }
  const df = 4.6 * (i.pt_patient_sec - i.pt_control_sec) + i.bilirubin_mg_dl;
  return { df, severe: df >= 32 };
}
