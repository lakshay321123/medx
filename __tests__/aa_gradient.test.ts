import { runAAGradient } from "@/lib/medical/engine/calculators/aa_gradient";

test("A-a gradient", () => {
  const r = runAAGradient({ fio2:0.21, pao2:80, paco2:40 });
  expect(r.a_a_gradient).toBeGreaterThan(0);
});
