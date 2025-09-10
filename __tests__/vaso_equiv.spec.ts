import { runNorepiEquivalent } from "../lib/medical/engine/calculators/vaso_equiv";

test("NE-equivalent", ()=>{ const o=runNorepiEquivalent({norepi_ug_kg_min:0.1,epi_ug_kg_min:0.05,dopamine_ug_kg_min:300,vasopressin_u_min:0.03})!; expect(o.norepi_equivalent_ug_kg_min).toBeGreaterThan(0.1); });
