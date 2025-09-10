
import { test, expect } from "@jest/globals";
import { pittBand } from "../lib/medical/engine/calculators/pitt_bacteremia_bands";

test("Pitt banding", () => {
  expect(pittBand(5)).toBe("higher");
  expect(pittBand(3)).toBe("low");
});
