import def from "../lib/medical/engine/calculators/ascvd_pce";
describe("ascvd_pce", () => {
  it("returns DISABLED note by default", () => {
    const r = (def as any).run({});
    expect(r.notes.join(" ")).toMatch(/DISABLED/);
    expect(r.value).toBe(0);
  });
});
