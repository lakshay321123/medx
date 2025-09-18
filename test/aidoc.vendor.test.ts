import { expect, test, vi, beforeEach } from "vitest";
import { callOpenAIJson } from "../lib/aidoc/vendor";
import { extractObservationInputs } from "../lib/aidoc/context";

const createMock = vi.fn();

vi.mock("openai", () => {
  return {
    default: class {
      responses = { create: createMock };
    }
  };
});

vi.mock("@/lib/medical/engine/extract", () => ({
  canonicalizeInputs: (x: any) => x,
}));

vi.mock("@/lib/patient/snapshot", () => ({
  inferCategory: () => "lab",
  labelFor: (row: any) => row?.name ?? null,
  valueFor: (row: any) => row?.value_text ?? row?.value_num ?? null,
}));

beforeEach(() => {
  createMock.mockReset();
});

test("AiDoc vendor: strict JSON accepted", async () => {
  createMock.mockResolvedValueOnce({
    output_text: JSON.stringify({
      reply: "hi",
      observations: { short: "s", long: "l" },
      save: { medications: [], conditions: [], labs: [], notes: [], prefs: [] }
    })
  });
  const out = await callOpenAIJson({ system: "", user: "", instruction: "" });
  expect(out.reply).toBe("hi");
  expect(createMock.mock.calls[0][0].response_format).toBeDefined();
});

test("AiDoc vendor: repairs wrapped text", async () => {
  createMock.mockResolvedValueOnce({
    output_text: "prefix {\"reply\":\"ok\",\"observations\":{\"short\":\"s\",\"long\":\"l\"},\"save\":{\"medications\":[],\"conditions\":[],\"labs\":[],\"notes\":[],\"prefs\":[]}} suffix"
  });
  const out = await callOpenAIJson({ system: "", user: "", instruction: "" });
  expect(out.reply).toBe("ok");
});

test("extractObservationInputs normalizes unicode analyte labels", () => {
  const rows = [
    {
      name: "Na⁺",
      value_text: "134",
      unit: "mmol∕L",
      observed_at: "2024-03-01T00:00:00Z",
    },
    {
      name: "HCO₃⁻",
      value_text: "10,5",
      unit: "mmol∕L",
      observed_at: "2024-03-02T00:00:00Z",
    },
    {
      name: "Albumin",
      value_text: "2,5",
      unit: "g/dL",
      observed_at: "2024-03-03T00:00:00Z",
    },
  ];
  const out = extractObservationInputs(rows as any);
  expect(out.Na).toBe(134);
  expect(out.HCO3).toBeCloseTo(10.5);
  expect(out.albumin).toBeCloseTo(2.5);
});
