import { test } from "node:test";
import { strict as assert } from "node:assert";
import { buildAiDocPrompt } from "@/lib/ai/prompts/aidoc";

test("prompt bans quoting labs >90d", () => {
  const p = buildAiDocPrompt({ profile:{}, labs:[], meds:[], conditions:[] } as any);
  assert.match(p, /Do NOT quote lab values older than 90 days/i);
});
