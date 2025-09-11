import def from "../lib/medical/engine/calculators/clinical_frailty_scale";
describe("clinical_frailty_scale", () => {
  it("labels the selected CFS score", () => {
    const r = (def as any).run({ cfs: 5 });
    expect(r.value).toBe(5);
    expect(r.notes[0]).toMatch(/Mildly Frail/);
  });
});
