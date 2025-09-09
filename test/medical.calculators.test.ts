import { expect, test } from "vitest";
import { computeAll, qtcFridericia } from "../lib/medical/calculators";

test("QTc Fridericia matches example", ()=>{
  const ms = qtcFridericia({ QTms:480, HR:92 });
  expect(Math.round(ms!)).toBeCloseTo(554, 0);
});

test("Anion gap basic", ()=>{
  const out = computeAll({ Na:140, Cl:104, HCO3:24 });
  expect(out.find(s => s.startsWith("Anion gap:"))).toBeDefined();
});
