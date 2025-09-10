import { register } from "../registry";

/**
 * sFlt-1/PlGF ratio with GA-aware interpretation (common cutoffs):
 * - <38: PE unlikely in next 1 week (rule-out; esp. <34w)
 * - 38–85: possible; monitor closely
 * - >=85 if GA <37w → suggestive of PE
 * - >=110 if GA >=37w → suggestive of PE
 */
export function computeSfltPlgf(params: {
  sflt1_pg_mL: number | null;
  plgf_pg_mL: number | null;
  ga_weeks: number | null; // gestational age in weeks (fraction OK)
}) {
  const { sflt1_pg_mL, plgf_pg_mL, ga_weeks } = params;
  if (sflt1_pg_mL == null || plgf_pg_mL == null || plgf_pg_mL === 0 || ga_weeks == null) {
    return {
      ratio: null,
      band: "insufficient_inputs",
      notes: ["Need sFlt-1, PlGF, and gestational age."],
    };
  }
  const ratio = sflt1_pg_mL / plgf_pg_mL;
  let band = "indeterminate";
  const threshold = ga_weeks >= 37 ? 110 : 85;

  if (ratio < 38) band = "rule_out_PE_short_term";
  else if (ratio >= threshold) band = "suggestive_of_preeclampsia";
  else band = "possible_monitor";

  return { ratio, band, notes: [`GA=${ga_weeks}w`, `threshold=${threshold}`] };
}

register({
  id: "sflt1_plgf_ratio",
  label: "sFlt-1/PlGF ratio",
  inputs: [
    { key: "sflt1_pg_mL", required: true },
    { key: "plgf_pg_mL", required: true },
    { key: "ga_weeks", required: true },
  ],
  run: computeSfltPlgf,
});
