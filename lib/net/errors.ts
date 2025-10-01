export function normalizeNetworkError(_err: unknown) {
  return { userMessage: "Network error" } as const;
}
