import { create, all } from "mathjs";
const math = create(all, { number: "BigNumber", precision: 64 });

export function evalMath(expr: string) {
  if (!/^[^=]+$/.test(expr)) throw new Error("Forbidden expression");
  const res = math.evaluate(expr);
  return math.format(res, { notation: "auto", lowerExp: -6, upperExp: 20 });
}
export function derive(expr: string, v: string) { return math.derivative(expr, v).toString(); }
export function simplify(expr: string) { return math.simplify(expr).toString(); }
export function solveEqn(expr: string, v: string) { return (math as any).solve?.(expr, v) ?? []; }

// (optional) units + constants
export function evalWithUnits(expr: string) {
  const v = math.evaluate(expr); // e.g. "5 N * 2 m"
  return v.toString();
}
export const CONST = { c:"299792458 m/s", h:"6.62607015e-34 J s", NA:"6.02214076e23 1/mol", g:"9.80665 m/s^2" };
