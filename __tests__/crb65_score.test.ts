import { runCRB65 } from "../lib/medical/engine/calculators/crb65_score";

describe("crb65_score", () => {
  it("assesses pneumonia severity", () => {
    const r = runCRB65({ confusion: true, rr_ge30: false, low_bp: true, age_ge65: true });
    expect(r?.score).toBe(3);
    expect(r?.band).toBe("high risk");
  });
});
