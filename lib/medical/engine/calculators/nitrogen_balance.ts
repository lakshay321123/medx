
import { register } from "../registry";
export interface NitrogenBalanceInput { protein_g_per_day: number; uun_g_per_day: number; non_urinary_losses_g?: number; }
export interface NitrogenBalanceResult { nitrogen_balance_g_per_day: number; band: "negative" | "neutral" | "positive"; }
export function runNitrogenBalance(i: NitrogenBalanceInput): NitrogenBalanceResult {
  const nonUrinary = i.non_urinary_losses_g ?? 4;
  const intakeN = i.protein_g_per_day / 6.25;
  const lossesN = i.uun_g_per_day + nonUrinary;
  const bal = intakeN - lossesN;
  let band: "negative" | "neutral" | "positive" = "neutral";
  if (bal < -2) band = "negative"; else if (bal > 2) band = "positive";
  return { nitrogen_balance_g_per_day: Number(bal.toFixed(2)), band };
}
register({
  id: "nitrogen_balance",
  label: "Nitrogen balance",
  inputs: [
    { key: "protein_g_per_day", required: true },
    { key: "uun_g_per_day", required: true },
    { key: "non_urinary_losses_g" },
  ],
  run: ({ protein_g_per_day, uun_g_per_day, non_urinary_losses_g }) => {
    if (protein_g_per_day == null || uun_g_per_day == null) return null;
    const r = runNitrogenBalance({ protein_g_per_day, uun_g_per_day, non_urinary_losses_g });
    return { id: "nitrogen_balance", label: "Nitrogen balance", value: r.nitrogen_balance_g_per_day, unit: "g/day", notes: [r.band], precision: 2 };
  },
});
