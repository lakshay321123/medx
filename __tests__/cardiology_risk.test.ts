import { describe, it, expect } from "vitest";
import { all } from "../lib/medical/engine/registry";
import "../lib/medical/engine/calculators";

describe("cardiology_risk", () => {
  it("calculates CHA2DS2-VASc score", () => {
    const f = all().find(f => f.id === "cha2ds2_vasc")!;
    const r = f.run({ age: 70, sex: "male", hx_chf: true, hx_htn: true, hx_vascular: true });
    expect(r?.value).toBe(4);
  });
});
