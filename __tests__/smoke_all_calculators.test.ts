/**
 * Smoke suite: all calculators should execute without throwing when provided heuristic inputs.
 * If a calculator truly requires a very specific data type, it should handle coercion or null return
 * rather than throwing.
 */
import { FORMULAE } from "../lib/medical/engine/registry";
import { makeContext } from "./helpers";

describe("Calculator smoke tests", () => {
  it("each calculator.run does not throw", () => {
    for (const f of FORMULAE) {
      const ctx = makeContext(f.inputs || []);
      expect(() => f.run(ctx)).not.toThrow();
    }
  });

  it("returned results have basic shape when not null", () => {
    for (const f of FORMULAE) {
      const ctx = makeContext(f.inputs || []);
      const r = f.run(ctx);
      if (r != null) {
        expect(r.id).toBeDefined();
        expect(r.label).toBeDefined();
        if (r.value != null) {
          expect(["number","string"]).toContain(typeof r.value);
        }
        if (r.unit != null) expect(typeof r.unit).toBe("string");
        if (r.notes != null) expect(Array.isArray(r.notes)).toBe(true);
      }
    }
  });
});
