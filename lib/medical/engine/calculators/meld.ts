
/**
 * MELD classic, MELD-Na, MELD 3.0
 * Sources:
 * - MELD-Na convention used by UNOS: cap Na to 125–137 and clamp MELD to 6–40. (See UW HepatitisC review). 
 * - MELD 3.0 formula components (female term, albumin and Na interactions). 
 *
 * References:
 * UW HepatitisC Online: “MELD 3.0” and MELD-Na description. 
 */
import { clamp, ln, round0to40, num } from "./utils";

export type MELDInputs = {
  bilirubin_mg_dL: number;
  creatinine_mg_dL: number;
  inr: number;
  sodium_mEq_L?: number | null;
  albumin_g_dL?: number | null;
  female?: boolean;
  on_dialysis_in_last_week?: boolean; // for MELD classic cap of creatinine 4.0 (and dialysis min 4 per convention)
};

function safeLab(x: number) {
  // Per MELD conventions, lab values less than 1 are set to 1 for the ln terms
  return Math.max(num(x, 1), 1);
}

export function calcMELDClassic(i: MELDInputs) {
  const bili = safeLab(i.bilirubin_mg_dL);
  const creat = safeLab(i.creatinine_mg_dL);
  const inr   = safeLab(i.inr);

  // Classic MELD (model for end-stage liver disease) (no etiology term)
  // MELD(i) = 3.78*ln(bili) + 11.2*ln(INR) + 9.57*ln(creat) + 6.43
  // If on dialysis twice in last week or 24h continuous, creat is set to at least 4.0
  const creat_used = i.on_dialysis_in_last_week ? Math.max(creat, 4) : creat;
  const meld = 3.78 * ln(bili) + 11.2 * ln(inr) + 9.57 * ln(creat_used) + 6.43;
  return round0to40(meld);
}

export function calcMELDNa(i: MELDInputs) {
  const meld = calcMELDClassic(i);
  const na_raw = i.sodium_mEq_L ?? 135;
  // Per UNOS MELD-Na: cap Na to 125–137
  const na = clamp(na_raw, 125, 137);
  // Commonly used MELD-Na: MELD-Na = MELD + 1.59*(135 - Na)
  const meldNa = meld + 1.59 * (135 - na);
  return round0to40(meldNa);
}

export function calcMELD3(i: MELDInputs) {
  // MELD 3.0 formula (HepatitisC Online summary):
  // MELD3.0 = 1.33*(female ? 1 : 0)
  //         + 4.56*ln(bili) + 0.82*(137 - Na) - 0.24*(137 - Na)*ln(bili)
  //         + 9.09*ln(INR) + 11.14*ln(creat)
  //         + 1.85*(3.5 - albumin) - 1.83*(3.5 - albumin)*ln(creat)
  // Labs must be >=1 for ln terms; use Na in [125, 137]; clamp final 6–40.
  const female = !!i.female;
  const bili = safeLab(i.bilirubin_mg_dL);
  const creat_raw = safeLab(i.creatinine_mg_dL);
  const creat = i.on_dialysis_in_last_week ? Math.max(creat_raw, 4) : creat_raw;
  const inr = safeLab(i.inr);
  const albumin = num(i.albumin_g_dL, 3.5);
  const na = clamp(num(i.sodium_mEq_L, 137), 125, 137);

  const termNa = (137 - na);
  const termAlb = (3.5 - albumin);

  let meld3 = 0;
  meld3 += 1.33 * (female ? 1 : 0);
  meld3 += 4.56 * ln(bili);
  meld3 += 0.82 * termNa;
  meld3 += -0.24 * termNa * ln(bili);
  meld3 += 9.09 * ln(inr);
  meld3 += 11.14 * ln(creat);
  meld3 += 1.85 * termAlb;
  meld3 += -1.83 * termAlb * ln(creat);

  return round0to40(meld3);
}

export function runMELD(i: MELDInputs) {
  const meld = calcMELDClassic(i);
  const meldNa = calcMELDNa(i);
  const meld3 = calcMELD3(i);
  return {
    MELD_classic: meld,
    MELD_Na: meldNa,
    MELD_3_0: meld3,
  };
}
