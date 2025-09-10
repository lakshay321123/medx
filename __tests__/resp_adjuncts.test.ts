
import { calcSF, calcOI, calcAA } from "../lib/medical/engine/calculators/sf_oi_osi";

test("Respiratory adjuncts compute", () => {
  const sf = calcSF({ pao2_mmHg: 60, spo2_percent: 90, fio2_fraction: 0.6, map_cmH2O: 12, paco2_mmHg: 40, baro_mmHg: 760 });
  expect(sf.P_F_ratio).toBeCloseTo(100, 0);
  const oi = calcOI({ pao2_mmHg: 60, fio2_fraction: 0.6, map_cmH2O: 12, spo2_percent: 90 });
  expect(oi.OI).toBeGreaterThan(0);
  const aa = calcAA({ fio2_fraction: 0.21, paco2_mmHg: 40, pao2_mmHg: 80, age_years: 60 });
  expect(typeof aa.A_A_gradient_mmHg).toBe("number");
});
