import { register } from "../registry";

export interface HHSInput {
  Na_meq_l: number;
  glucose_mg_dl: number;
  pH?: number;
  bicarb_mEq_L?: number;
  ketones_present?: boolean;
  weight_kg?: number;
  sex?: "male"|"female";
  age?: number;
}
export function runHHS(i: HHSInput) {
  const effective_osm = 2 * i.Na_meq_l + i.glucose_mg_dl / 18;
  const hhs_osm_flag = effective_osm >= 320;
  const severe_hyperglycemia = i.glucose_mg_dl >= 600;
  const minimal_keto = i.ketones_present === false || (i.bicarb_mEq_L != null && i.bicarb_mEq_L > 18);
  const likely = hhs_osm_flag && severe_hyperglycemia && minimal_keto;
  // crude water deficit estimate using TBW*(Na/140 - 1)
  let water_deficit_l: number | undefined = undefined;
  if (i.weight_kg != null && i.sex) {
    const tbw_factor = (i.age != null && i.age >= 60) ? (i.sex === "male" ? 0.5 : 0.45) : (i.sex === "male" ? 0.6 : 0.5);
    const TBW = tbw_factor * i.weight_kg;
    const deficit = TBW * ((i.Na_meq_l / 140) - 1);
    water_deficit_l = Number(deficit.toFixed(1));
  }
  return { effective_osm_mOsm_kg: Number(effective_osm.toFixed(1)), hhs_likely: likely, water_deficit_l };
}

register({
  id: "hhs_flags",
  label: "HHS flags (effective osm)",
  inputs: [
    { key: "Na_meq_l", required: true },
    { key: "glucose_mg_dl", required: true },
    { key: "pH" }, { key: "bicarb_mEq_L" }, { key: "ketones_present" },
    { key: "weight_kg" }, { key: "sex" }, { key: "age" },
  ],
  run: (ctx: any) => {
    const r = runHHS(ctx as any);
    const notes: string[] = [];
    if (r.hhs_likely) notes.push("HHS likely (clinical correlation required)");
    if (r.water_deficit_l != null) notes.push(`est. water deficit ${r.water_deficit_l} L`);
    return { id: "hhs_flags", label: "Effective osmolality", value: r.effective_osm_mOsm_kg, unit: "mOsm/kg", notes, precision: 1 };
  },
});
