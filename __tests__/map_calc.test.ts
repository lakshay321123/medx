import { runMAP } from "@/lib/medical/engine/calculators/map_calc";

test("MAP", () => {
  const r = runMAP({ sbp_mmHg:120, dbp_mmHg:80 });
  expect(r.map_mmHg).toBeCloseTo(93.333, 3);
});
