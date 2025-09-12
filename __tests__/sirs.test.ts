import { FORMULAE } from "../lib/medical/engine/registry";
import "../lib/medical/engine/calculators/sirs";

describe("sirs", () => {
  it("evaluates available criteria and handles partial inputs", () => {
    const f = FORMULAE.find(f => f.id === "sirs")!;
    const r = f.run({ temp_c: 39, HR: 100 });
    expect(r).not.toBeNull();
    expect(r?.value).toBe(2);
    expect(r?.notes).toContain("criteria met: 2");
    expect(r?.notes).toContain("criteria evaluated: 2/4");
    expect(r?.notes).toContain("incomplete inputs");
    expect(r?.notes).toContain("SIRS positive");
  });
});
