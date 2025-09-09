export const toMgDlFromMmolGlucose = (mmol?: number) =>
  mmol != null ? mmol * 18 : undefined;

export const toMmolFromMgDlGlucose = (mg?: number) =>
  mg != null ? mg / 18 : undefined;

export const toMgDlFromUmolCr = (umol?: number) =>
  umol != null ? umol / 88.4 : undefined;

export const toUmolFromMgDlCr = (mg?: number) =>
  mg != null ? mg * 88.4 : undefined;

export const toMgDlFromUmolBili = (umol?: number) =>
  umol != null ? umol / 17.1 : undefined;

export const toUmolFromMgDlBili = (mg?: number) =>
  mg != null ? mg * 17.1 : undefined;

export const ethanolOsmDivisor = (mgdl: number, divisor = 4.6) =>
  mgdl / divisor;

export function safeNumber(x: any) {
  const n = typeof x === "string" ? Number(x) : x;
  return Number.isFinite(n) ? (n as number) : undefined;
}
