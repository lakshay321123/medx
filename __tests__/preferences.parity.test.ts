import { describe, expect, it } from "vitest";
import { PREF_SECTIONS } from "../components/settings/prefs.schema";

describe("preferences schema", () => {
  it("ensures section-row combinations are unique", () => {
    const rows = PREF_SECTIONS.flatMap((section) =>
      section.rows.map((row) => `${section.id}:${row.id}:${row.type}`)
    );
    expect(new Set(rows).size).toBe(rows.length);
  });

  it("includes every desktop tab id", () => {
    const tabIds = PREF_SECTIONS.map((section) => section.id);
    expect(tabIds).toEqual([
      "General",
      "Notifications",
      "Personalization",
      "Connectors",
      "Schedules",
      "Data controls",
      "Security",
      "Account",
    ]);
  });
});
