import { register } from "../registry";

/**
 * FRAX (scaffold): country‑specific model; recommend using external FRAX service or embedded tables.
 */
export function runFRAX(i:{ country:string }){
  return { needs:["FRAX model for "+(i?.country||"country")], note:"Scaffold—use official FRAX tool for calibrated fracture risk." };
}
register({ id:"frax_scaffold", label:"FRAX (scaffold)", inputs:[{key:"country",required:true}], run: runFRAX as any });
