import { register } from "../registry";
// FENa = (UrineNa * PlasmaCr) / (PlasmaNa * UrineCr) * 100
register({
  id:"fena",
  label:"FE Na⁺",
  tags:["renal"],
  inputs:[
    { key:"urine_na", unit:"mmol/L", required:true },
    { key:"Na", unit:"mmol/L", required:true },
    { key:"urine_creatinine", unit:"mg/dL", required:true },
    { key:"Cr", unit:"mg/dL", required:true },
  ],
  run: ({ urine_na, urine_creatinine, Na, Cr }) => {
    if ([urine_na, urine_creatinine, Na, Cr].some(v => v==null)) return null;
    const den = Na * urine_creatinine;
    if (!isFinite(den) || den <= 0) return null;
    const val = (urine_na * Cr) / den * 100;
    return { id:"fena", label:"FE Na⁺", value:Number(val.toFixed(1)), unit:"%", precision:1 };
  },
});
// FEUrea = (UrineUrea * PlasmaCr) / (PlasmaUrea * UrineCr) * 100
register({
  id:"feurea",
  label:"FE Urea",
  tags:["renal"],
  inputs:[
    { key:"urine_urea", unit:"mg/dL", required:true },
    { key:"BUN", unit:"mg/dL", required:true },
    { key:"urine_creatinine", unit:"mg/dL", required:true },
    { key:"Cr", unit:"mg/dL", required:true },
  ],
  run: ({ urine_urea, urine_creatinine, BUN, Cr }) => {
    if ([urine_urea, urine_creatinine, BUN, Cr].some(v => v==null)) return null;
    const den = BUN * urine_creatinine;
    if (!isFinite(den) || den <= 0) return null;
    const val = (urine_urea * Cr) / den * 100;
    return { id:"feurea", label:"FE Urea", value:Number(val.toFixed(1)), unit:"%", precision:1 };
  },
});
