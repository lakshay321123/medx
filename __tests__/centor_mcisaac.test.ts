import { test, expect } from "@jest/globals";
import { runCentorMcIsaac } from "../lib/medical/engine/calculators/centor_mcisaac";

test("Centor/McIsaac", () => {
  const out = runCentorMcIsaac({ age: 20, tonsillar_exudate: true, tender_anterior_cervical_nodes: true, fever_ge_38C: true, cough_present: false });
  expect(out.points).toBe(4);
});
