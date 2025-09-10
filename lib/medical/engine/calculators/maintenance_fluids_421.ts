/**
 * Maintenance Fluids (4-2-1 rule) mL/hr:
 * 4 mL/kg for first 10 kg
 * 2 mL/kg for next 10 kg
 * 1 mL/kg for each kg > 20
 */
export interface Maint421Input { weight_kg: number; }
export interface Maint421Result { rate_ml_hr: number; }
export function runMaintenanceFluids421(i: Maint421Input): Maint421Result {
  const w = i.weight_kg;
  let rate = 0;
  if (w <= 0) return { rate_ml_hr: 0 };
  const first10 = Math.min(w, 10);
  rate += 4 * first10;
  const next10 = Math.min(Math.max(w - 10, 0), 10);
  rate += 2 * next10;
  const rest = Math.max(w - 20, 0);
  rate += 1 * rest;
  return { rate_ml_hr: rate };
}
