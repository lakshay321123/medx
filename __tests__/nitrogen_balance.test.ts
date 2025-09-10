
import { runNitrogenBalance } from "@/lib/medical/engine/calculators/nitrogen_balance";
test("Nitrogen balance basic", () => {
  const r = runNitrogenBalance({ protein_g_per_day: 100, uun_g_per_day: 12, non_urinary_losses_g: 4 });
  expect(r.nitrogen_balance_g_per_day).toBeCloseTo(0, 2);
  expect(r.band).toBe("neutral");
});
