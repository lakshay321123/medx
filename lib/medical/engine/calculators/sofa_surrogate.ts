
import { register } from "../registry";

export type SOFAInputs = {
  PaO2?: number, FiO2?: number, ventilatory_support?: boolean,
  Platelets_k?: number,
  Bilirubin_mg_dL?: number,
  MAP?: number, dopamine_ug_kg_min?: number, dobutamine?: boolean, norepi_ug_kg_min?: number, epi_ug_kg_min?: number,
  GCS?: number,
  Creatinine_mg_dL?: number, Urine_mL_day?: number
};

function respSub(i: SOFAInputs){
  if (i.PaO2==null || i.FiO2==null) return null;
  const PF = i.PaO2/i.FiO2;
  const supported = i.ventilatory_support===true;
  if (PF > 400) return 0;
  if (PF <= 400 && PF > 300) return 1;
  if (PF <= 300 && PF > 200) return 2;
  if (PF <= 200 && supported) return 3;
  if (PF <= 100 && supported) return 4;
  return null;
}

function coagSub(platelets_k?: number){
  if (platelets_k==null) return null;
  if (platelets_k >= 150) return 0;
  if (platelets_k < 150 && platelets_k >= 100) return 1;
  if (platelets_k < 100 && platelets_k >= 50) return 2;
  if (platelets_k < 50 && platelets_k >= 20) return 3;
  if (platelets_k < 20) return 4;
  return null;
}

function liverSub(bili?: number){
  if (bili==null) return null;
  if (bili < 1.2) return 0;
  if (bili <= 1.9) return 1;
  if (bili <= 5.9) return 2;
  if (bili <= 11.9) return 3;
  return 4; // >=12
}

function cardioSub(i: SOFAInputs){
  const mapLow = (i.MAP!=null && i.MAP<70) ? 1 : null;
  const dopa = i.dopamine_ug_kg_min;
  const ne = i.norepi_ug_kg_min;
  const epi = i.epi_ug_kg_min;
  const dobut = i.dobutamine===true;
  // Highest applicable tier
  if ((dopa!=null && dopa>15) || (ne!=null && ne>0.1) || (epi!=null && epi>0.1)) return 4;
  if ((dopa!=null && dopa>5) || (ne!=null && ne<=0.1 && ne>0) || (epi!=null && epi<=0.1 && epi>0)) return 3;
  if ((dopa!=null && dopa>0 && dopa<=5) || dobut) return 2;
  if (mapLow===1) return 1;
  if (i.MAP!=null) return 0;
  return null;
}

function cnsSub(gcs?: number){
  if (gcs==null) return null;
  if (gcs>=15) return 0;
  if (gcs>=13) return 1;
  if (gcs>=10) return 2;
  if (gcs>=6) return 3;
  return 4;
}

function renalSub(cr?: number, urine?: number){
  // Use whichever is available; take higher subscore if both are present
  let byCr: number|null = null, byUrine: number|null = null;
  if (cr!=null){
    if (cr < 1.2) byCr = 0;
    else if (cr <= 1.9) byCr = 1;
    else if (cr <= 3.4) byCr = 2;
    else if (cr <= 4.9) byCr = 3;
    else byCr = 4;
  }
  if (urine!=null){
    if (urine < 200) byUrine = 4;
    else if (urine < 500) byUrine = 3;
    else byUrine = 0;
  }
  if (byCr==null && byUrine==null) return null;
  if (byCr!=null && byUrine!=null) return Math.max(byCr, byUrine);
  return (byCr!=null ? byCr : byUrine)!;
}

export function runSOFASurrogate(i: SOFAInputs){
  const subs: Record<string, number|null> = {
    respiratory: respSub(i),
    coagulation: coagSub(i.Platelets_k),
    liver: liverSub(i.Bilirubin_mg_dL),
    cardiovascular: cardioSub(i),
    cns: cnsSub(i.GCS),
    renal: renalSub(i.Creatinine_mg_dL, i.Urine_mL_day)
  };
  const present = Object.values(subs).filter(v => v!=null) as number[];
  const total = present.reduce((a,b)=>a+b, 0);
  return { subscores: subs, total, components_counted: present.length };
}

register({
  id: "sofa_surrogate",
  label: "SOFA surrogate (partial total + subscores)",
  inputs: [
    {key:"PaO2"},{key:"FiO2"},{key:"ventilatory_support"},
    {key:"Platelets_k"},{key:"Bilirubin_mg_dL"},
    {key:"MAP"},{key:"dopamine_ug_kg_min"},{key:"dobutamine"},{key:"norepi_ug_kg_min"},{key:"epi_ug_kg_min"},
    {key:"GCS"},
    {key:"Creatinine_mg_dL"},{key:"Urine_mL_day"}
  ],
  run: runSOFASurrogate as any,
});
