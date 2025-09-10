import { test, expect } from "@jest/globals";
import { runMaddreyDF } from "../lib/medical/engine/calculators/maddrey_df";

test("Maddrey DF severe", () => {
  const out = runMaddreyDF({ pt_patient_sec:22, pt_control_sec:12, bilirubin_mg_dl:10 });
  expect(out.df).toBeCloseTo(4.6*(10)+10,1);
  expect(out.severe).toBe(true);
});
