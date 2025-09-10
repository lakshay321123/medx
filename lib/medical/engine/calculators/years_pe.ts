/**
 * YEARS PE rule (0–3)
 * Criteria: clinical DVT signs, hemoptysis, PE most likely
 */
export interface YEARSInput { dvt_signs: boolean; hemoptysis: boolean; pe_most_likely: boolean; }
export interface YEARSResult { score: number; }
export function runYEARS(i: YEARSInput): YEARSResult {
  const s = [i.dvt_signs, i.hemoptysis, i.pe_most_likely].filter(Boolean).length;
  return { score: s };
}
