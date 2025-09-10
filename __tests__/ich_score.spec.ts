import { runICHScore } from "../../lib/medical/engine/calculators/ich_score";

test("ICH score components", () => {
  const out = runICHScore({GCS:7, Volume_mL:32, Infratentorial:true, IVH:true, Age:82})!;
  // GCS 7 -> +1, Volume >=30 -> +1, Infratentorial +1, IVH +1, Age >=80 +1 => total 5
  expect(out.score).toBe(5);
});
