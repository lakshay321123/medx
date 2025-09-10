import { runTTKG } from "@/lib/medical/engine/calculators/ttkg";

test("TTKG", () => {
  const r = runTTKG({ urine_k_meq_l:60, plasma_k_meq_l:3, urine_osm_mosm_kg:600, plasma_osm_mosm_kg:300 });
  expect(r.ttkg).toBeCloseTo(10, 3);
});
