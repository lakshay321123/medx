import { register } from "../registry";

export function runTroponinDelta(i:{ baseline_ng_L:number, repeat_ng_L:number, absolute_cutoff_ng_L?:number, relative_pct_cutoff?:number }){
  if (i==null || [i.baseline_ng_L,i.repeat_ng_L].some(v=>v==null || !isFinite(v as number))) return null;
  const absDelta = i.repeat_ng_L - i.baseline_ng_L;
  const relPct = i.baseline_ng_L>0 ? (absDelta / i.baseline_ng_L) * 100 : Infinity;
  const absCut = i.absolute_cutoff_ng_L ?? 5;       // default illustrative; set per-assay
  const relCut = i.relative_pct_cutoff ?? 20;
  const positive = Math.abs(absDelta)>=absCut || Math.abs(relPct)>=relCut;
  return { delta_ng_L: Number(absDelta.toFixed(1)), delta_pct: Number(relPct.toFixed(1)), positive, note:"Use assay-specific cutoffs in production." };
}
register({ id:"troponin_delta", label:"Troponin delta (assay‑aware)", inputs:[
  {key:"baseline_ng_L",required:true},{key:"repeat_ng_L",required:true},{key:"absolute_cutoff_ng_L"},{key:"relative_pct_cutoff"}
], run: runTroponinDelta as any });
