export type CalculatorRunner = (input: any) => any;
export interface CalculatorMeta {
  id: string;            // short slug id
  name: string;          // human readable
  tags?: string[];       // optional tags/groups
  run: CalculatorRunner; // execute with input
  version?: string;
}
export type CalculatorRegistry = Record<string, CalculatorMeta>;
