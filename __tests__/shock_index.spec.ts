import { runShockIndex } from "../../lib/medical/engine/calculators/shock_index";

test("Shock index normal/elevated/critical bands", () => {
  expect(runShockIndex({HR:70, SBP:120})!.value).toBeCloseTo(0.58, 2);
  expect(runShockIndex({HR:100, SBP:100})!.band).toBe("elevated");
  expect(runShockIndex({HR:130, SBP:90})!.band).toBe("critical");
});
