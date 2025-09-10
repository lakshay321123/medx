import { runTransfusionHelper } from "../lib/medical/engine/calculators/transfusion_helper";

test("Transfusion helper", ()=>{ const o=runTransfusionHelper({hgb_g_dL:6.8,plt_k_uL:8,active_bleeding:false,acs:false,neurosurgery_or_eye:false})!; expect(o.recommendations.length).toBeGreaterThan(0); });
