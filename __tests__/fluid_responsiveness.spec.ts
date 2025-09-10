import { runFluidResponsivenessGate } from "../lib/medical/engine/calculators/fluid_responsiveness";

test("Fluid responsiveness gate", ()=>{ const o=runFluidResponsivenessGate({plr_delta_sv_pct:12})!; expect(o.fluid_responsive_likely).toBe(true); });
