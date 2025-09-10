import { runNLR } from "@/lib/medical/engine/calculators/nlr";

test("NLR", () => {
  const r = runNLR({ neutrophils_abs:4.0, lymphocytes_abs:2.0 });
  expect(r.ratio).toBe(2.0);
});
