import { runOsmAdvanced } from "../lib/medical/engine/calculators/osmolality_ext";

test("Advanced osmolality", ()=>{ const o=runOsmAdvanced({sodium_mEq_L:140,bun_mg_dL:14,glucose_mg_dL:90,ethanol_mg_dL:74})!; expect(o.serum_osm_calc_mOsm_kg).toBeGreaterThan(290); });
