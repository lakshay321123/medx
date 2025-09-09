export type InputSpec = {
  key: string;
  unit?: string;
  aliases?: string[];
  required?: boolean;
};

export type CalcResult = {
  id: string;
  label: string;
  value?: number | string;
  unit?: string;
  notes?: string[];
  precision?: number;
};

export type Formula = {
  id: string;
  label: string;
  inputs: InputSpec[];
  run: (ctx: Record<string, any>) => CalcResult | null;
  priority?: number;
  tags?: string[];
};

export const FORMULAE: Formula[] = [];
export function register(formula: Formula) { FORMULAE.push(formula); }
