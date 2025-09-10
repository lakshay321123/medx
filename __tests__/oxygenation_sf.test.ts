import { calcSF } from "../lib/medical/engine/calculators/sf_oi_osi";

test("S/F ratio computes explicitly", () => {
  const out = calcSF({ spo2_percent: 92, fio2_fraction: 0.4, pao2_mmHg: 60, map_cmH2O: 10, paco2_mmHg: 40, baro_mmHg: 760 });
  expect(out.S_F_ratio).toBeCloseTo(230, 0); // 92 / 0.4 = 230
});
