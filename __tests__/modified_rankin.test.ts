import def from "../lib/medical/engine/calculators/modified_rankin";
describe("modified_rankin", () => {
  it("returns label for mRS", () => {
    const r = (def as any).run({ mrs: 3 });
    expect(r.value).toBe(3);
    expect(r.notes[0]).toMatch(/Moderate/);
  });
});
