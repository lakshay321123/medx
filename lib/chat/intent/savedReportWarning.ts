import { isSavedReportRequest } from "./isSavedReportRequest";
import { hasFreshUpload } from "../session/uploadState";

function normalizeModeKey(mode?: string): string {
  return (mode || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isAiDocMode(mode?: string): boolean {
  const norm = normalizeModeKey(mode);
  return norm === "aidoc" || norm === "docai" || norm === "docmode" || norm === "aidocmode";
}

export function shouldShowSavedReportWarning({
  mode,
  message,
  threadId,
}: {
  mode?: string;
  message?: string | null;
  threadId?: string | null;
}): boolean {
  if (isAiDocMode(mode)) return false;

  const text = message ?? "";
  if (!isSavedReportRequest(text)) return false;

  const id = typeof threadId === "string" ? threadId : undefined;
  const freshUploadPresent = id ? hasFreshUpload(id) : false;
  return !freshUploadPresent;
}

export const REPORTS_LOCKED_MESSAGE = "Reports are available only in AI Doc mode";
