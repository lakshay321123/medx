import { runSerumOsmolality } from "@/lib/medical/engine/calculators/serum_osmolality_advanced";

test("Serum osmolality calc", () => {
  // 2*140 + 180/18 + 28/2.8 = 280 + 10 + 10 = 300
  const r = runSerumOsmolality({ na:140, glucose_mg_dl:180, bun_mg_dl:28 });
  expect(r.calc_osm).toBeCloseTo(300, 2);
});
