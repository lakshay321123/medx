import { runPLR } from "@/lib/medical/engine/calculators/plr";

test("PLR", () => {
  const r = runPLR({ platelets_abs:250, lymphocytes_abs:2.5 });
  expect(r.ratio).toBeCloseTo(100, 3);
});
