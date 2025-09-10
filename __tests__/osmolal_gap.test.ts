import { runOsmolalGap } from "@/lib/medical/engine/calculators/osmolal_gap";

test("Osmolal gap", () => {
  const r = runOsmolalGap({ measured_osm:320, calculated_osm:300 });
  expect(r.gap).toBe(20);
});
