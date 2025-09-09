import { computeAll } from "../lib/medical/engine/computeAll";
import { expect, test } from "vitest";

test("anion gap & corrected Na", () => {
  const out = computeAll({ Na: 128, Cl: 104, HCO3: 18, glucose_mgdl: 256, albumin: 3.0 });
  const ag = out.find(r => r.id === "anion_gap")!;
  expect(ag.value).toBeCloseTo(6.0, 1); // (128 + 0) - (104 + 18) = 6
  const cna = out.find(r => r.id === "corrected_na_1_6")!;
  expect(cna.value).toBeCloseTo(130.5, 1); // 1.6 factor
});

test("albumin-corrected AG & delta gap", () => {
  const out = computeAll({ Na: 140, Cl: 104, HCO3: 18, albumin: 3.0 });
  const agc = out.find(r => r.id === "anion_gap_albumin_corrected")!;
  expect(agc.value as number).toBeCloseTo(((140)-(104+18)) + 2.5*(4-3), 1); // 18 + 2.5 = 20.5
  const dg = out.find(r => r.id === "delta_gap")!;
  expect((dg.notes||[]).some(n => n.startsWith("ΔAG"))).toBeTruthy();
});

test("Winter's formula", () => {
  const out = computeAll({ HCO3: 18 });
  const w = out.find(r => r.id === "winters_formula")!;
  expect(w.value as number).toBeCloseTo(1.5*18+8, 1); // 35 mmHg
});
