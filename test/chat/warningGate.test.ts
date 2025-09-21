import { beforeEach, describe, expect, it, vi } from "vitest";

const hasFreshUploadMock = vi.fn<(threadId: string) => boolean>();

vi.mock("../../lib/chat/session/uploadState", () => ({
  hasFreshUpload: (threadId: string) => hasFreshUploadMock(threadId)
}));

import { shouldShowSavedReportWarning, REPORTS_LOCKED_MESSAGE } from "../../lib/chat/intent/savedReportWarning";

function makeWarningCheck(mode: string, message: string, freshUpload: boolean) {
  hasFreshUploadMock.mockReturnValue(freshUpload);
  return shouldShowSavedReportWarning({ mode, message, threadId: "thread-1" });
}

describe("saved report warning gate", () => {
  beforeEach(() => {
    hasFreshUploadMock.mockReset();
  });

  it("warns in wellness when saved history is requested without fresh uploads", () => {
    expect(makeWarningCheck("wellness", "pull my reports", false)).toBe(true);
    expect(hasFreshUploadMock).toHaveBeenCalledWith("thread-1");
  });

  it("does not warn when fresh uploads exist", () => {
    expect(makeWarningCheck("doctor", "compare my reports", true)).toBe(false);
    expect(hasFreshUploadMock).toHaveBeenCalledWith("thread-1");
  });

  it("ignores generic news queries", () => {
    expect(makeWarningCheck("research", "latest reports on covid", false)).toBe(false);
    expect(hasFreshUploadMock).not.toHaveBeenCalled();
  });

  it("allows AI Doc saved history requests", () => {
    expect(makeWarningCheck("ai-doc", "show my previous reports", false)).toBe(false);
  });

  it("handles edge phrasing", () => {
    expect(makeWarningCheck("doctor", "what do my reports say", false)).toBe(true);
  });

  it("exposes the message constant", () => {
    expect(REPORTS_LOCKED_MESSAGE).toBe("Reports are available only in AI Doc mode");
  });
});
