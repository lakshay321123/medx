import { test } from "node:test";
import assert from "node:assert/strict";
import { runRules } from "@/lib/aidoc/rules";

test("A1c stale -> repeat", () => {
  const t=new Date(Date.now()-91*24*60*60*1000).toISOString();
  const out=runRules({ labs:[{name:"HbA1c",value:7.4,takenAt:t}], meds:[], conditions:[], mem:{prefs:[{key:"pref_test_time",value:"morning"}]} } as any);
  assert.match(out.steps.join(" "), /Repeat HbA1c/i);
});
