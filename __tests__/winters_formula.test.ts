import { calc_winters, winters_notes } from "../lib/medical/engine/calculators/winters_formula";

test("Winter's formula", () => {
  const r = calc_winters({ hco3_mmol_l: 16 });
  expect(r.expected_paco2_mm_hg).toBeCloseTo(32.0, 1); // 1.5*16+8=32
  expect(r.low).toBeCloseTo(30.0, 1);
  expect(r.high).toBeCloseTo(34.0, 1);
  const notes = winters_notes(r);
  expect(notes[0]).toContain("Expected PaCO2");
});
