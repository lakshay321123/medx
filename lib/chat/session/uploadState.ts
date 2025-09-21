const uploadState = new Map<string, boolean>();

export function markHasFreshUpload(threadId: string) {
  if (!threadId) return;
  uploadState.set(threadId, true);
}

export function clearFreshUpload(threadId: string) {
  if (!threadId) return;
  uploadState.set(threadId, false);
}

export function hasFreshUpload(threadId: string): boolean {
  if (!threadId) return false;
  return uploadState.get(threadId) === true;
}
