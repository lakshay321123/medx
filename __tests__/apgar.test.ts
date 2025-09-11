import { calc_apgar } from "../lib/medical/engine/calculators/apgar";
describe("calc_apgar", () => {
  it("sums five 0–2 components", () => {
    const r = calc_apgar({ appearance: 2, pulse: 2, grimace: 2, activity: 2, respiration: 2 });
    expect(r.score).toBe(10);
    expect(r.category).toBe("normal");
  });
});
