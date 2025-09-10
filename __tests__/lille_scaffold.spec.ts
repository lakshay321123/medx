import { runLilleScaffold } from "../lib/medical/engine/calculators/lille_scaffold";

test("Lille scaffold", ()=>{ const o=runLilleScaffold({})!; expect(o.needs).toBeDefined(); });
