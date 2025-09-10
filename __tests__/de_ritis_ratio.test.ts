import { runDeRitis } from "@/lib/medical/engine/calculators/de_ritis_ratio";

test("De Ritis ratio", () => {
  const r = runDeRitis({ ast_u_l:40, alt_u_l:20 });
  expect(r.ratio).toBeCloseTo(2.0, 2);
});
