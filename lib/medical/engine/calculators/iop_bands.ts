
import { register } from "../registry";
export interface IOPInput { iop_mmHg: number; }
export function runIOPBand(i: IOPInput) {
  const x = i.iop_mmHg;
  let band: "hypotony" | "normal" | "ocular_hypertension" = "normal";
  if (x < 6) band = "hypotony"; else if (x > 21) band = "ocular_hypertension";
  return { band };
}
register({
  id: "iop_bands",
  label: "Intraocular pressure band",
  inputs: [{ key: "iop_mmHg", required: true }],
  run: ({ iop_mmHg }) => {
    if (iop_mmHg == null) return null;
    const r = runIOPBand({ iop_mmHg });
    return { id: "iop_bands", label: "IOP", value: iop_mmHg, unit: "mmHg", notes: [r.band], precision: 0 };
  },
});
