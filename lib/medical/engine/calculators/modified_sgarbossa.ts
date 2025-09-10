// lib/medical/engine/calculators/modified_sgarbossa.ts
// Smith modified Sgarbossa rule helper.
// Pass either explicit flags for concordant criteria or arrays of per-lead ST and S wave values to evaluate discordance threshold.

export interface ModSgarbossaInput {
  concordant_ste_ge_1mm?: boolean | null;
  concordant_std_v1_v3_ge_1mm?: boolean | null;
  st_j_mm_by_lead?: number[] | null;        // positive for STE, negative for STD
  s_wave_depth_mm_by_lead?: number[] | null; // positive magnitude (use absolute depth in mm)
}

export interface ModSgarbossaOutput {
  positive: boolean;
  reasons: string[];
}

export function runModifiedSgarbossa(i: ModSgarbossaInput): ModSgarbossaOutput {
  const reasons: string[] = [];
  if (i.concordant_ste_ge_1mm) reasons.push("concordant_ST_elevation");
  if (i.concordant_std_v1_v3_ge_1mm) reasons.push("concordant_ST_depression_V1_V3");

  const st = i.st_j_mm_by_lead ?? [];
  const s = i.s_wave_depth_mm_by_lead ?? [];
  const n = Math.min(st.length, s.length);
  for (let k=0; k<n; k++) {
    const stj = st[k];
    const sval = s[k];
    if (sval > 0 && stj >= 1) {
      const ratio = -stj / sval; // negative by convention
      if (ratio <= -0.25) {
        reasons.push("excessive_discordant_STe_ratio_le_−0.25");
        break;
      }
    }
  }
  return { positive: reasons.length > 0, reasons };
}
