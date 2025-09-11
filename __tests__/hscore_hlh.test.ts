import def from "../lib/medical/engine/calculators/hscore_hlh";
describe("hscore_hlh", () => {
  it("returns DISABLED note by default", () => {
    const r = (def as any).run({});
    expect(r.notes.join(" ")).toMatch(/DISABLED/);
    expect(r.value).toBe(0);
  });
});
