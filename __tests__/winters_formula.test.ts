  import { calc_winters_formula } from "../lib/medical/engine/calculators/winters_formula";

  describe("calc_winters_formula", () => {

it("gives expected PaCO2 and interpretation", () => {
  const r = calc_winters_formula({ hco3: 12, measured_paco2: 30 });
  expect(r.expected).toBeCloseTo(26, 0);
  expect(r.low).toBeCloseTo(24, 0);
  expect(r.high).toBeCloseTo(28, 0);
  expect(r.comment).toBe("concurrent respiratory acidosis");
});

  });
