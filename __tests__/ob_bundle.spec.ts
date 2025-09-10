import { runBishop, runAPGAR, runHELLP } from "../../lib/medical/engine/calculators/ob_bundle";

test("Bishop scoring", () => {
  const out = runBishop({Dilation_cm:4, Effacement_pct:70, Station:0, Consistency:"soft", Position:"anterior"})!;
  expect(out.score).toBeGreaterThan(6);
});

test("APGAR sum", () => {
  const out = runAPGAR({HR:2, Resp:2, Tone:2, Reflex:2, Color:1})!;
  expect(out.score).toBe(9);
});

test("HELLP flags", () => {
  const out = runHELLP({Platelets_k:85, AST:120, ALT:90, LDH:650})!;
  expect(out.hellp).toBe(true);
});
