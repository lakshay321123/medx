import { runVBAC_Grobman_Scaffold } from "../lib/medical/engine/calculators/vbac_grobman_scaffold";

test("VBAC scaffold", ()=>{ const o=runVBAC_Grobman_Scaffold({})!; expect(o.needs).toBeDefined(); });
