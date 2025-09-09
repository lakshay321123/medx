// lib/medical/engine/registry.ts

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

// Raw register (legacy, no deduplication)
export function register(formula: Formula) {
  FORMULAE.push(formula);
}

// Idempotent register to avoid duplicate IDs across merges
export function registerUnique(formula: Formula) {
  const i = FORMULAE.findIndex(f => f.id === formula.id);
  if (i === -1) {
    FORMULAE.push(formula);
  } else {
    // Uncomment if you prefer replacement over skip:
    // FORMULAE[i] = formula;
  }
}
