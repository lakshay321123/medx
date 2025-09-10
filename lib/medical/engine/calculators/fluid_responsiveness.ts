import { register } from "../registry";

export function runFluidResponsivenessGate(i:{ plr_delta_sv_pct?:number, ppv_pct?:number, svv_pct?:number }){
  const flags:string[]=[];
  if (i.plr_delta_sv_pct!=null && isFinite(i.plr_delta_sv_pct) && i.plr_delta_sv_pct>=10) flags.push("PLR ΔSV ≥10%");
  if (i.ppv_pct!=null && isFinite(i.ppv_pct) && i.ppv_pct>=13) flags.push("PPV ≥13%");
  if (i.svv_pct!=null && isFinite(i.svv_pct) && i.svv_pct>=12) flags.push("SVV ≥12%");
  const responder = flags.length>0;
  return { fluid_responsive_likely: responder, triggers: flags };
}
register({ id:"fluid_responsiveness_gate", label:"Fluid responsiveness (gate)", inputs:[
  {key:"plr_delta_sv_pct"},{key:"ppv_pct"},{key:"svv_pct"}
], run: runFluidResponsivenessGate as any });
