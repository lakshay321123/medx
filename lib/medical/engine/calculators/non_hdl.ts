/**
 * Non HDL cholesterol = Total Cholesterol - HDL
 */
export interface NonHDLInput { total_chol_mg_dl: number; hdl_mg_dl: number; }
export interface NonHDLResult { non_hdl_mg_dl: number; }
export function runNonHDL(i: NonHDLInput): NonHDLResult {
  return { non_hdl_mg_dl: i.total_chol_mg_dl - i.hdl_mg_dl };
}
