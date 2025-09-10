/**
 * NIHSS total (0 to 42)
 * Caller supplies an array of item points or an object of named items
 * The function sums numeric values
 */
export type NIHSSInput = number[] | Record<string, number>;
export interface NIHSSResult { total: number; severity: "none" | "minor" | "moderate" | "moderate-severe" | "severe"; }
export function runNIHSS(input: NIHSSInput): NIHSSResult {
  let total = 0;
  if (Array.isArray(input)) total = input.reduce((a,b)=>a+(b||0), 0);
  else total = Object.values(input).reduce((a,b)=>a+(b||0), 0);
  let sev: NIHSSResult["severity"] = "none";
  if (total >= 21) sev = "severe";
  else if (total >= 16) sev = "moderate-severe";
  else if (total >= 5) sev = "moderate";
  else if (total >= 1) sev = "minor";
  return { total, severity: sev };
}
