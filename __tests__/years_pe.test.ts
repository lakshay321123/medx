import { runYEARS } from "@/lib/medical/engine/calculators/years_pe";

test("YEARS PE", () => {
  const r = runYEARS({ dvt_signs:true, hemoptysis:false, pe_most_likely:true });
  expect(r.score).toBe(2);
});
