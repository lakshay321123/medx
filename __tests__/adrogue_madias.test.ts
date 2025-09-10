import { adrogueMadiasDeltaNaPerL } from "../lib/medical/engine/calculators/sodium_tools";

test("Adrogué–Madias", () => {
  const out = adrogueMadiasDeltaNaPerL(120, 513, 70, "male", 50);
  expect(out.predicted_deltaNa_per_L).toBeDefined();
});
