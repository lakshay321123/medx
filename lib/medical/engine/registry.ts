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
export function register(formula: Formula) {
  if (FORMULAE.some(f => f.id === formula.id)) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[registry] Duplicate id skipped: ${formula.id}`);
    }
    return;
  }
  FORMULAE.push(formula);
}
