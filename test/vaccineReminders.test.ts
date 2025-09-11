import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { getVaccineReminders } from "@/lib/vaccines/reminders";

describe("vaccine reminders", () => {
  it("provides adult reminders with official link", () => {
    const r = getVaccineReminders({ age: 30, region: "US" });
    const td = r.vaccines.find((v) => v.name.toLowerCase().includes("td"));
    assert.ok(td);
    assert.equal(td!.status, "due");
    assert.ok(td!.link.includes("cdc.gov"));
  });

  it("falls back to WHO schedule for unknown region", () => {
    const r = getVaccineReminders({ age: 30, region: "XX" });
    assert.ok(r.vaccines.length >= 1);
    assert.ok(r.vaccines[0].link.includes("who.int"));
  });
});
