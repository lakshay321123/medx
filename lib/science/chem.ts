const ATOM_MASS: Record<string, number> = { H:1.00794, C:12.0107, N:14.0067, O:15.9994, Na:22.98977, Cl:35.453, P:30.97376, S:32.065, K:39.0983, Ca:40.078, Fe:55.845, Cu:63.546, Zn:65.38 };
export function molarMass(formula: string) {
  const tokens = formula.match(/[A-Z][a-z]?|\d+/g) || [];
  let sum = 0, i = 0;
  while (i < tokens.length) {
    const el = tokens[i++], count = Number(tokens[i] && /^\d+$/.test(tokens[i]) ? tokens[i++] : 1);
    if (!(el in ATOM_MASS)) throw new Error(`Unknown element ${el}`);
    sum += ATOM_MASS[el] * count;
  }
  return sum; // g/mol
}
