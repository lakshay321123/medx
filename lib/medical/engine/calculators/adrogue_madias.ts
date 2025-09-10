// lib/medical/engine/calculators/adrogue_madias.ts
// Expected change in serum Na per 1 L of infusate: ΔNa ≈ (Na_inf + K_inf − Na_serum) / (TBW + 1)

export interface AdrogueInput {
  infusate_na_mEq_L?: number | null; // e.g., D5W=0, NS=154, 3% Saline=513
  infusate_k_mEq_L?: number | null;  // usually 0 unless K added
  serum_na_mEq_L?: number | null;
  total_body_water_L?: number | null; // TBW = weight_kg * factor (0.6M/0.5F typical); compute upstream
}

export interface AdrogueOutput {
  delta_na_per_L: number; // mEq/L per 1 L
}

export function runAdrogueMadias(i: AdrogueInput): AdrogueOutput {
  const na_inf = i.infusate_na_mEq_L ?? 0;
  const k_inf = i.infusate_k_mEq_L ?? 0;
  const na_ser = i.serum_na_mEq_L ?? 0;
  const tbw = Math.max(0.1, i.total_body_water_L ?? 0);
  const delta = (na_inf + k_inf - na_ser) / (tbw + 1.0);
  return { delta_na_per_L: delta };
}
