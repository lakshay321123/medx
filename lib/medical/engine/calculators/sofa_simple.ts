/**
 * SOFA simplified calculation. Inputs are mapped to standard cutoffs.
 * Respiratory (PaO2/FiO2), Coagulation (platelets x10^3/uL),
 * Liver (bilirubin mg/dL), Cardiovascular (MAP or vasopressors flag),
 * CNS (GCS), Renal (creatinine mg/dL)
 */
export interface SOFAInput {
  pao2_fio2: number; // ratio
  platelets_x10e3: number;
  bilirubin_mg_dl: number;
  map_mmHg: number;
  on_vasopressors: boolean;
  gcs: number;
  creatinine_mg_dl: number;
}
export interface SOFAResult { total: number; parts: { resp: number; coag: number; liver: number; cardio: number; cns: number; renal: number; }; }
function sResp(r: number) {
  if (r < 100) return 4;
  if (r < 200) return 3;
  if (r < 300) return 2;
  if (r < 400) return 1;
  return 0;
}
function sCoag(p: number) {
  if (p < 20) return 4;
  if (p < 50) return 3;
  if (p < 100) return 2;
  if (p < 150) return 1;
  return 0;
}
function sLiver(b: number) {
  if (b >= 12.0) return 4;
  if (b >= 6.0) return 3;
  if (b >= 2.0) return 2;
  if (b >= 1.2) return 1;
  return 0;
}
function sCardio(map: number, vas: boolean) {
  if (vas) return 3; // simplified: any vasopressors scores at least 3
  if (map < 70) return 1;
  return 0;
}
function sCNS(g: number) {
  if (g < 6) return 4;
  if (g < 10) return 3;
  if (g < 13) return 2;
  if (g < 15) return 1;
  return 0;
}
function sRenal(cr: number) {
  if (cr >= 5.0) return 4;
  if (cr >= 3.5) return 3;
  if (cr >= 2.0) return 2;
  if (cr >= 1.2) return 1;
  return 0;
}
export function runSOFA(i: SOFAInput): SOFAResult {
  const resp = sResp(i.pao2_fio2);
  const coag = sCoag(i.platelets_x10e3);
  const liver = sLiver(i.bilirubin_mg_dl);
  const cardio = sCardio(i.map_mmHg, i.on_vasopressors);
  const cns = sCNS(i.gcs);
  const renal = sRenal(i.creatinine_mg_dl);
  const total = resp + coag + liver + cardio + cns + renal;
  return { total, parts: { resp, coag, liver, cardio, cns, renal } };
}
