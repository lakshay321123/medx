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
  inputs?: InputSpec[];
  run: (ctx: Record<string, any>) => CalcResult | null;
  priority?: number;
  tags?: string[];
};
const REG = new Map<string, Formula>();
export function register(def: Formula) {
  if (!def?.id) throw new Error("Calculator missing id");
  if (REG.has(def.id)) throw new Error(`Duplicate calculator id: ${def.id}`);

  const requiredKeys = (def.inputs || [])
    .filter(i => i.required)
    .map(i => i.key);
  const originalRun = def.run;
  def.run = (ctx: Record<string, any>) => {
    if (requiredKeys.some(k => ctx[k] == null)) return null;
    return originalRun(ctx);
  };

  REG.set(def.id, def);
}
export function all(): Formula[] { return [...REG.values()]; }
