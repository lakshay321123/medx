import { test, expect } from "@jest/globals";
import { runGBS } from "../lib/medical/engine/calculators/glasgow_blatchford";

test("GBS example", () => {
  const out = runGBS({ bun_mmol_l: 12, hb_g_dl: 9, male: true, sbp: 95, pulse: 110, melena: true, syncope: true, hepatic_disease: false, heart_failure: true });
  expect(out.score).toBeGreaterThanOrEqual(10);
});
