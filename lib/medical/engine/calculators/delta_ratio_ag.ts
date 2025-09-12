import { register } from "../registry";
register({
  id:"delta_ratio_ag",
  label:"Delta ratio (AG)",
  tags:["acid-base"],
  inputs:[ { key:"Na", required:true }, { key:"Cl", required:true }, { key:"HCO3", required:true } ],
  run: ({ Na, Cl, HCO3 }) => {
    if (Na==null || Cl==null || HCO3==null) return null;
    const ag = Na - (Cl + HCO3);
    const dr = (ag - 12) / (24 - HCO3);
    const notes: string[] = [];
    if (!isFinite(dr)) return null;
    if (dr < 0.4) notes.push("concurrent NAGMA likely");
    else if (dr <= 2) notes.push("isolated HAGMA range");
    else notes.push("concurrent metabolic alkalosis or chronic resp acidosis");
    return { id:"delta_ratio_ag", label:"Delta ratio (AG)", value:+dr.toFixed(2), precision:2, notes };
  },
});
