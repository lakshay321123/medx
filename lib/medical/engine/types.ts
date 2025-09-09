export type CalcInputMap = Record<string, number | undefined>;

export interface CalcResult {
  id: string;
  label: string;
  value: number;
  unit?: string;
  precision?: number;
  notes?: string[];
}

export interface Calculator {
  id: string;
  label: string;
  // List inputs your calc uses; `required:true` means return null if missing.
  inputs: Array<{ key: string; required?: boolean }>;
  run: (inputs: CalcInputMap) => CalcResult | null;
}

export type Registry = Map<string, Calculator>;

