import { runLactateClearance } from "../lib/medical/engine/calculators/lactate_clearance";

test("Lactate clearance", ()=>{ const o=runLactateClearance({initial_mmol_L:6.0,later_mmol_L:3.0})!; expect(o.lactate_clearance_pct).toBe(50); });
