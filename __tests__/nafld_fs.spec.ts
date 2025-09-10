import { runNAFLD_FS } from "../lib/medical/engine/calculators/nafld_fs";

test("NAFLD-FS", ()=>{ const o=runNAFLD_FS({age_years:55,bmi:32,ifg_or_dm:true,ast_u_L:60,alt_u_L:50,platelets_k_uL:150,albumin_g_dL:3.5})!; expect(o.band).toBeDefined(); });
