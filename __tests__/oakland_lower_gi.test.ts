import def from "../lib/medical/engine/calculators/oakland_lower_gi";
describe("oakland_lower_gi", () => {
  it("returns DISABLED note by default", () => {
    const r = (def as any).run({});
    expect(r.notes.join(" ")).toMatch(/DISABLED/);
    expect(r.value).toBe(0);
  });
});
