/**
 * Index runner for calculator tests.
 * This file is optional; Jest will auto-discover tests in Tests/*.test.ts.
 * It adds two helpful checks:
 *  1) Ensures the calculators module loads and registers without throwing.
 *  2) Asserts the registry has a large number of calculators (sanity).
 */

import "../lib/medical/engine/calculators/lab_interpretation";
const registry = require("../lib/medical/engine/registry");

describe("Registry sanity", () => {
  test("calculators module loads", () => {
    expect(true).toBe(true);
  });

  test("registry contains many calculators", () => {
    const keys = Object.keys(
      (registry.registry ?? {})
    );
    // Expect hundreds of calculators (tune threshold as your repo grows)
    expect(keys.length).toBeGreaterThan(400);
  });
});
