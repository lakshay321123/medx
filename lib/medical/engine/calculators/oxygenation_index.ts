import { register } from "../registry";

export type OIInputs = { FiO2: number, mPaw: number, PaO2: number };
export type OSIInputs = { FiO2: number, mPaw: number, SpO2: number };
export type OIResult = { OI: number };
export type OSIResult = { OSI: number };

export function runOI({ FiO2, mPaw, PaO2 }: OIInputs): OIResult | null {
  if ([FiO2, mPaw, PaO2].some(v => v == null || !isFinite(v as number))) return null;
  if (FiO2 <= 0 || mPaw <= 0 || PaO2 <= 0) return null;
  const OI = Number(((FiO2 * mPaw * 100) / PaO2).toFixed(2));
  return { OI };
}

export function runOSI({ FiO2, mPaw, SpO2 }: OSIInputs): OSIResult | null {
  if ([FiO2, mPaw, SpO2].some(v => v == null || !isFinite(v as number))) return null;
  if (FiO2 <= 0 || mPaw <= 0 || SpO2 <= 0) return null;
  const OSI = Number(((FiO2 * mPaw * 100) / SpO2).toFixed(2));
  return { OSI };
}

register({
  id: "oxygenation_index",
  label: "Oxygenation Index (OI) & OSI",
  inputs: [{ key: "FiO2", required: true }, { key: "mPaw", required: true }, { key: "PaO2" }, { key: "SpO2" }],
  run: ({FiO2, mPaw, PaO2, SpO2}: any) => {
    const out: any = {};
    const oi = PaO2 != null ? runOI({FiO2, mPaw, PaO2}) : null;
    const osi = SpO2 != null ? runOSI({FiO2, mPaw, SpO2}) : null;
    if (oi) out.OI = oi.OI;
    if (osi) out.OSI = osi.OSI;
    return Object.keys(out).length ? out : null;
  },
});
