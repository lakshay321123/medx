import { register } from "../registry";

export type FEInputs = { UrineX: number, PlasmaX: number, UrineCr: number, PlasmaCr: number };

export function runFENa({UrineX: UNa, PlasmaX: PNa, UrineCr: UCr, PlasmaCr: PCr}: FEInputs) {
  if ([UNa,PNa,UCr,PCr].some(v => v==null || !isFinite(v as number))) return null;
  if (UCr<=0 || PCr<=0 || PNa<=0) return null;
  const value = Number(((UNa*PCr)/(PNa*UCr)*100).toFixed(2));
  return { value, unit: "%" };
}

export function runFEUrea({UrineX: UUrea, PlasmaX: PUrea, UrineCr: UCr, PlasmaCr: PCr}: FEInputs) {
  if ([UUrea,PUrea,UCr,PCr].some(v => v==null || !isFinite(v as number))) return null;
  if (UCr<=0 || PCr<=0 || PUrea<=0) return null;
  const value = Number(((UUrea*PCr)/(PUrea*UCr)*100).toFixed(2));
  return { value, unit: "%" };
}

export function runFECl({UrineX: UCl, PlasmaX: PCl, UrineCr: UCr, PlasmaCr: PCr}: FEInputs) {
  if ([UCl,PCl,UCr,PCr].some(v => v==null || !isFinite(v as number))) return null;
  if (UCr<=0 || PCr<=0 || PCl<=0) return null;
  const value = Number(((UCl*PCr)/(PCl*UCr)*100).toFixed(2));
  return { value, unit: "%" };
}

export type TTKGInputs = { UrineK: number, PlasmaK: number, UrineOsm: number, PlasmaOsm: number };
export function runTTKG({UrineK, PlasmaK, UrineOsm, PlasmaOsm}: TTKGInputs) {
  if ([UrineK,PlasmaK,UrineOsm,PlasmaOsm].some(v => v==null || !isFinite(v as number))) return null;
  if (PlasmaK<=0 || UrineOsm<=0 || PlasmaOsm<=0) return null;
  const value = Number(((UrineK/PlasmaK) * (PlasmaOsm/UrineOsm)).toFixed(2));
  return { value };
}

export type OsmGapInputs = { Na: number, Glucose: number, BUN: number, Ethanol?: number, MeasuredOsm: number };
export function runOsmolarGap({Na,Glucose,BUN,Ethanol=0,MeasuredOsm}: OsmGapInputs) {
  if ([Na,Glucose,BUN,MeasuredOsm,Ethanol].some(v => v==null || !isFinite(v as number))) return null;
  const calc = 2*Na + (Glucose/18) + (BUN/2.8) + (Ethanol/4.6);
  const gap = Number((MeasuredOsm - calc).toFixed(1));
  return { calculated: Number(calc.toFixed(1)), gap };
}

register({ id:"fena", label:"FENa", inputs:[{key:"UrineX",required:true},{key:"PlasmaX",required:true},{key:"UrineCr",required:true},{key:"PlasmaCr",required:true}], run: runFENa as any });
register({ id:"feurea", label:"FEUrea", inputs:[{key:"UrineX",required:true},{key:"PlasmaX",required:true},{key:"UrineCr",required:true},{key:"PlasmaCr",required:true}], run: runFEUrea as any });
register({ id:"fecl", label:"FECl", inputs:[{key:"UrineX",required:true},{key:"PlasmaX",required:true},{key:"UrineCr",required:true},{key:"PlasmaCr",required:true}], run: runFECl as any });
register({ id:"ttkg", label:"TTKG", inputs:[{key:"UrineK",required:true},{key:"PlasmaK",required:true},{key:"UrineOsm",required:true},{key:"PlasmaOsm",required:true}], run: runTTKG as any });
register({ id:"osmolar_gap", label:"Osmolar Gap", inputs:[{key:"Na",required:true},{key:"Glucose",required:true},{key:"BUN",required:true},{key:"MeasuredOsm",required:true},{key:"Ethanol"}], run: runOsmolarGap as any });
