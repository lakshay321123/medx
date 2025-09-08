import { expect, test, vi, beforeEach } from "vitest";
import { callOpenAIJson } from "../lib/aidoc/vendor";

const createMock = vi.fn();

vi.mock("openai", () => {
  return {
    default: class {
      responses = { create: createMock };
    }
  };
});

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
