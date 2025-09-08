import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAiDocPrompt } from "@/lib/ai/prompts/aidoc";

test("prompt bans quoting labs >90d", () => {
  const t=new Date(Date.now()-91*24*60*60*1000).toISOString();
  const p=buildAiDocPrompt({profile:{},labs:[{name:"HbA1c",value:7.4,takenAt:t}],meds:[],conditions:[]});
  assert.match(p, /Recent Labs \(≤90d\): none/i);
});
