import { register } from "../registry";

/**
 * Norepinephrine‑equivalent calculator (approximate). epi≈norepi; dopamine 150 µg/kg/min ≈ 1 µg/kg/min norepi (very rough); vasopressin adds 0.03 U/min ≈ 0.1 µg/kg/min norepi surrogate.
 */
export function runNorepiEquivalent(i:{ norepi_ug_kg_min?:number, epi_ug_kg_min?:number, dopamine_ug_kg_min?:number, vasopressin_u_min?:number }){
  const ne = (i.norepi_ug_kg_min||0) + (i.epi_ug_kg_min||0) + ((i.dopamine_ug_kg_min||0)/150) + ((i.vasopressin_u_min||0)>0?0.1:0);
  return { norepi_equivalent_ug_kg_min: Number(ne.toFixed(3)), note:"Approximate; use institutional equivalence if available." };
}
register({ id:"vaso_equiv", label:"Vasopressor equivalence (NE‑eq)", inputs:[
  {key:"norepi_ug_kg_min"},{key:"epi_ug_kg_min"},{key:"dopamine_ug_kg_min"},{key:"vasopressin_u_min"}
], run: runNorepiEquivalent as any });
