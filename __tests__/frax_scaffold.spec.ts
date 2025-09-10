import { runFRAX } from "../lib/medical/engine/calculators/frax_scaffold";

test("FRAX scaffold", ()=>{ const o=runFRAX({country:"US"})!; expect(o.needs).toBeDefined(); });
