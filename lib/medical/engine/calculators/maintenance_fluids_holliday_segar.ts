/**
 * Pediatric maintenance fluids (Holliday-Segar 100-50-20 rule)
 * Daily mL: 100 mL/kg for first 10 kg, 50 mL/kg for next 10 kg, 20 mL/kg for each kg above 20
 * Hourly mL: divide daily by 24
 */
export interface HollidaySegarInput { weight_kg: number; }
export interface HollidaySegarResult { daily_ml: number; hourly_ml: number; }
export function runHollidaySegar(i: HollidaySegarInput): HollidaySegarResult {
  const w = i.weight_kg;
  if (w <= 0) return { daily_ml: 0, hourly_ml: 0 };
  const first10 = Math.min(w, 10);
  const next10 = Math.min(Math.max(w - 10, 0), 10);
  const rest = Math.max(w - 20, 0);
  const daily = 100*first10 + 50*next10 + 20*rest;
  return { daily_ml: daily, hourly_ml: daily/24 };
}
