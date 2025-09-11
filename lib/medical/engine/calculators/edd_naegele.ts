export type EddInputs = { lmp_iso: string; as_of_iso?: string };

function parseISO(s?:string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function diffDays(a:Date, b:Date){ return Math.floor((a.getTime()-b.getTime())/(24*3600*1000)); }

export function calc_edd(i: EddInputs): { edd_iso:string; ga_weeks:number; ga_days:number } {
  const lmp = parseISO(i.lmp_iso);
  const as_of = parseISO(i.as_of_iso) || new Date();
  if (!lmp) throw new Error("invalid_lmp");
  const edd = new Date(lmp.getTime() + 280*24*3600*1000); // 40w
  const days = diffDays(as_of, lmp);
  const ga_weeks = Math.max(0, Math.floor(days/7));
  const ga_days = Math.max(0, days % 7);
  return { edd_iso: edd.toISOString().slice(0,10), ga_weeks, ga_days };
}

const def = {
  id: "edd_naegele",
  label: "EDD (Naegele) + Gestational Age",
  inputs: [
    { id: "lmp_iso", label: "LMP date (YYYY-MM-DD)", type: "date" },
    { id: "as_of_iso", label: "As of (YYYY-MM-DD)", type: "date" }
  ],
  run: (args: EddInputs) => {
    const r = calc_edd(args);
    const notes = [`GA ${r.ga_weeks}w ${r.ga_days}d`, `EDD ${r.edd_iso}`];
    return { id: "edd_naegele", label: "EDD/GA", value: r.ga_weeks + r.ga_days/7, unit: "weeks", precision: 1, notes, extra: r };
  },
};
export default def;
