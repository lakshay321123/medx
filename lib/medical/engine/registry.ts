export interface CalcInput {
  key: string;
  required?: boolean;
}

export interface CalcResult {
  id: string;
  label: string;
  value?: number | string;
  unit?: string;
  precision?: number;
  notes?: string[];
}

export interface Calculator {
  id: string;
  label: string;
  tags?: string[];
  inputs: CalcInput[];
  run: (ctx: Record<string, any>) => CalcResult | null | undefined;
  priority?: number;
}

const registry: Calculator[] = [];

export function register(calc: Calculator) {
  registry.push(calc);
}

export function getRegistry(): Calculator[] {
  return registry.slice().sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
}
