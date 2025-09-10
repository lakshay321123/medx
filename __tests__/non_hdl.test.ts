import { runNonHDL } from "@/lib/medical/engine/calculators/non_hdl";

test("Non HDL", () => {
  const r = runNonHDL({ total_chol_mg_dl:190, hdl_mg_dl:45 });
  expect(r.non_hdl_mg_dl).toBe(145);
});
