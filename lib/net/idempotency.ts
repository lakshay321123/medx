let fallbackCounter = 0;

export function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  fallbackCounter += 1;
  return `idem-${Date.now()}-${fallbackCounter}`;
}
