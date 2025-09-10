
import { runPAO2Alveolar, runAAGradient } from "../lib/medical/engine/calculators/gas_exchange";

test("A–a gradient", () => {
  const pao2 = runPAO2Alveolar({ FiO2:0.21, PaCO2_mmHg:40 })!;
  const aa = runAAGradient({ PaO2_mmHg:90, PAO2_mmHg: pao2.PAO2_mmHg })!;
  expect(aa.A_a_gradient_mmHg).toBeGreaterThanOrEqual(0);
});
