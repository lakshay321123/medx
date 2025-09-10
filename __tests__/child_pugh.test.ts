import { runChildPugh } from "@/lib/medical/engine/calculators/child_pugh";

test("Child-Pugh classes", () => {
  const a = runChildPugh({ bilirubin_mg_dl:1.2, albumin_g_dl:4.0, inr:1.2, ascites:"none", encephalopathy:"none" });
  expect(a.klass).toBe("A");
  const c = runChildPugh({ bilirubin_mg_dl:4.2, albumin_g_dl:2.6, inr:2.5, ascites:"moderate-severe", encephalopathy:"moderate-severe" });
  expect(c.klass).toBe("C");
});
