
import { runHACOR } from "../lib/medical/engine/calculators/hacor";

test("HACOR bands", () => {
  const low = runHACOR({ heart_rate_bpm: 90, ph: 7.40, gcs: 15, pao2_fio2: 250, respiratory_rate: 18 });
  expect(low.risk_band).toBe("lower");
  const high = runHACOR({ heart_rate_bpm: 140, ph: 7.22, gcs: 10, pao2_fio2: 90, respiratory_rate: 40 });
  expect(high.risk_band).toBe("higher");
});
