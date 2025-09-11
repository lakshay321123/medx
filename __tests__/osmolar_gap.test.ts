import { calc_osmolar_gap } from "../lib/medical/engine/calculators/osmolar_gap";

test("osmolar gap (no ethanol)", () => {
  const r = calc_osmolar_gap({ na_mmol_l: 140, glucose_mg_dl: 90, bun_mg_dl: 14, measured_mosm_kg: 290 });
  // calc = 2*140 + 90/18 + 14/2.8 = 280 + 5 + 5 = 290; gap 0
  expect(r.calc_mosm_kg).toBeCloseTo(290.0, 1);
  expect(r.osm_gap).toBeCloseTo(0.0, 1);
});
