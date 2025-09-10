import { murrayLIS } from "../lib/medical/engine/calculators/murray_lis";

test("Murray LIS mean", () => {
  const out = murrayLIS({ cxr_quadrants_involved: 3, pao2_fio2_mmHg: 150, peep_cmH2O: 10, compliance_ml_per_cmH2O: 35 });
  expect(out.lis_mean).toBeCloseTo( (3+3+2+3)/4, 5 );
});
