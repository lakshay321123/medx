import { register } from "../registry";
// FENa = (UrineNa * PlasmaCr) / (PlasmaNa * UrineCr) * 100
register({
  id:"fena",
  label:"FE Na⁺",
  tags:["renal"],
  inputs:[
    { key:"urine_na", required:true }, { key:"urine_creatinine", required:true },
    { key:"Na", required:true }, { key:"Cr", required:true },
  ],
  run: ({ urine_na, urine_creatinine, Na, Cr }) => {
    if ([urine_na, urine_creatinine, Na, Cr].some(v => v==null)) return null;
    const val = (urine_na * Cr) / (Na * urine_creatinine) * 100;
    return { id:"fena", label:"FE Na⁺", value:Number(val.toFixed(1)), unit:"%", precision:1 };
  },
});
// FEUrea = (UrineUrea * PlasmaCr) / (PlasmaUrea * UrineCr) * 100
register({
  id:"feurea",
  label:"FE Urea",
  tags:["renal"],
  inputs:[
    { key:"urine_urea", required:true }, { key:"urine_creatinine", required:true },
    { key:"BUN", required:true }, { key:"Cr", required:true },
  ],
  run: ({ urine_urea, urine_creatinine, BUN, Cr }) => {
    if ([urine_urea, urine_creatinine, BUN, Cr].some(v => v==null)) return null;
    const val = (urine_urea * Cr) / (BUN * urine_creatinine) * 100;
    return { id:"feurea", label:"FE Urea", value:Number(val.toFixed(1)), unit:"%", precision:1 };
  },
});
