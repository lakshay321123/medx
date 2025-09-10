/**
 * De Ritis ratio = AST / ALT
 */
export interface DeRitisInput { ast_u_l: number; alt_u_l: number; }
export interface DeRitisResult { ratio: number; }
export function runDeRitis(i: DeRitisInput): DeRitisResult {
  return { ratio: i.ast_u_l / i.alt_u_l };
}
