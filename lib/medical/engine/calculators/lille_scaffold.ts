import { register } from "../registry";

export function runLilleScaffold(i:{ note?:string }){
  return { needs:["Bil day0/day7 (µmol/L), albumin (g/L), PT or INR, creatinine, age, etiology"], note:"Lille score scaffold—plug exact coefficients & units." };
}
register({ id:"lille_scaffold", label:"Lille score (scaffold)", inputs:[], run: runLilleScaffold as any });
