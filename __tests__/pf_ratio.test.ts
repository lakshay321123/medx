import { runPFRatio } from "@/lib/medical/engine/calculators/pf_ratio";

test("P/F ratio", () => {
  const r = runPFRatio({ pao2:80, fio2:0.5 });
  expect(r.ratio).toBeCloseTo(160, 2);
  expect(r.ards_severity).toBe("moderate");
});
