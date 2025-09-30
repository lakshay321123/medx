import { describe, expect, test } from "vitest";
import { PREF_SECTIONS } from "../components/settings/prefs.schema";

describe("preferences parity", () => {
  test("desktop and mobile render identical rows", () => {
    const allRows = PREF_SECTIONS.flatMap((section) =>
      section.rows.map((row) => `${section.id}:${row.id}`),
    );
    const desktopSupported = new Set(allRows);
    const mobileSupported = new Set(allRows);
    expect(mobileSupported).toEqual(desktopSupported);
  });
});
