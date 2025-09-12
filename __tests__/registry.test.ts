/**
 * Registry integrity tests
 */
import { describe, it, expect } from "vitest";
import { all, Formula } from "../lib/medical/engine/registry";
import "../lib/medical/engine/calculators";

describe("Registry integrity", () => {
  it("has unique ids and non-empty labels", () => {
    const ids = new Set<string>();
    for (const f of all()) {
      expect(typeof f.id).toBe("string");
      expect(f.id.length).toBeGreaterThan(0);
      expect(typeof f.label).toBe("string");
      expect(f.label.length).toBeGreaterThan(0);
      expect(ids.has(f.id)).toBe(false);
      ids.add(f.id);
    }
  });

  it("inputs have unique keys per formula", () => {
    for (const f of all()) {
      const seen = new Set<string>();
      for (const inp of f.inputs) {
        expect(typeof inp.key).toBe("string");
        expect(inp.key.length).toBeGreaterThan(0);
        expect(seen.has(inp.key)).toBe(false);
        seen.add(inp.key);
      }
    }
  });
});
