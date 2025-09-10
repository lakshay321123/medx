  import { calc_child_pugh } from "../lib/medical/engine/calculators/child_pugh";

  describe("calc_child_pugh", () => {

it("scores Child–Pugh Class C", () => {
  const r = calc_child_pugh({ bilirubin_mg_dl: 3.2, albumin_g_dl: 2.6, inr: 2.0, ascites: "mild", encephalopathy: "mild" });
  expect(r.score).toBe(12);
  expect(r.class).toBe("C");
});

  });
