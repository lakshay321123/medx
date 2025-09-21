import { describe, expect, it } from "vitest";
import { isSavedReportRequest } from "../../lib/chat/intent/isSavedReportRequest";

describe("isSavedReportRequest", () => {
  it("detects direct saved report pulls", () => {
    expect(isSavedReportRequest("pull my reports")).toBe(true);
    expect(isSavedReportRequest("compare my reports")).toBe(true);
    expect(isSavedReportRequest("show my previous reports")).toBe(true);
    expect(isSavedReportRequest("what do my reports say")).toBe(true);
  });

  it("ignores news-style queries", () => {
    expect(isSavedReportRequest("latest reports on covid")).toBe(false);
    expect(isSavedReportRequest("WHO report on boosters")).toBe(false);
  });

  it("ignores requests containing URLs", () => {
    expect(isSavedReportRequest("news report: https://example.com")).toBe(false);
  });
});
