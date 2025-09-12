import { describe, expect, it, vi } from "vitest";
import { finalizeWithOpenAI } from "../lib/medical/engine/verification/openaiFinalizer";

vi.mock("../lib/llm", () => ({
  openaiText: vi.fn(async () => JSON.stringify({ result: 16, explanation: "140 - (100 + 24) = 16" })),
}));

describe("finalizeWithOpenAI", () => {
  it("accepts OpenAI result as final", async () => {
    const res = await finalizeWithOpenAI({
      calculator: "anion_gap",
      formulaSpec: "AG = Na - (Cl + HCO3)",
      inputs: { Na: 140, Cl: 100, HCO3: 24 },
      localResult: 20,
      precision: 0,
    });
    expect(res.final).toBe(16);
    expect(res.pass).toBe(false);
  });
});
