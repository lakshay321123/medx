import { runSodiumCorrectionRate } from "@/lib/medical/engine/calculators/sodium_correction_rate";

test("Sodium correction rate flags", () => {
  const ok = runSodiumCorrectionRate({ current_na:120, target_na:124, hours:12 });
  expect(ok.projected_24h_change).toBeCloseTo(8, 2);
  expect(ok.safety_flag).toBe("caution"); // boundary case considered caution

  const unsafe = runSodiumCorrectionRate({ current_na:120, target_na:140, hours:24 });
  expect(unsafe.projected_24h_change).toBeCloseTo(20, 2);
  expect(unsafe.safety_flag).toBe("unsafe");
});
