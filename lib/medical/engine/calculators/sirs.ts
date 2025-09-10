import { register } from "../registry";

/**
 * SIRS criteria count
 * Temp >38 or <36; HR >90; RR >20 or PaCO2 <32; WBC >12 or <4 or bands >10%
 */
export function calc_sirs({
  temp_c, hr, rr, paco2, wbc, bands_percent
}: {
  temp_c: number,
  hr: number,
  rr: number,
  paco2?: number,
  wbc: number,
  bands_percent?: number
}) {
  let s = 0;
  if (temp_c > 38 || temp_c < 36) s += 1;
  if (hr > 90) s += 1;
  if (rr > 20 || (paco2 != null && paco2 < 32)) s += 1;
  if (wbc > 12 || wbc < 4 || ((bands_percent ?? 0) > 10)) s += 1;
  return s;
}

register({
  id: "sirs",
  label: "SIRS Criteria",
  tags: ["critical care", "infectious disease"],
  inputs: [
    { key: "temp_c", required: true },
    { key: "hr", required: true },
    { key: "rr", required: true },
    { key: "paco2" },
    { key: "wbc", required: true },
    { key: "bands_percent" }
  ],
  run: ({ temp_c, hr, rr, paco2, wbc, bands_percent }: { temp_c: number; hr: number; rr: number; paco2?: number; wbc: number; bands_percent?: number; }) => {
    const v = calc_sirs({ temp_c, hr, rr, paco2, wbc, bands_percent });
    return { id: "sirs", label: "SIRS Criteria", value: v, unit: "criteria", precision: 0, notes: [] };
  },
});
