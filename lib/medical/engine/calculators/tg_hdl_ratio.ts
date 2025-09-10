/**
 * Triglyceride to HDL ratio
 */
export interface TGHdlInput { trig_mg_dl: number; hdl_mg_dl: number; }
export interface TGHdlResult { ratio: number; }
export function runTGHdlRatio(i: TGHdlInput): TGHdlResult {
  return { ratio: i.trig_mg_dl / i.hdl_mg_dl };
}
