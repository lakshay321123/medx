export function applyHandHeuristics<T extends Record<string, any> | null | undefined>(input: T) {
  if (!input || typeof input !== "object") return input;

  try {
    const serialized = JSON.stringify(input).toLowerCase();
    if (
      (input as any).fracture_present &&
      serialized.includes("metacarp") &&
      (serialized.includes("5th") || serialized.includes("fifth")) &&
      serialized.includes("neck")
    ) {
      if (!(input as any).suspected_type) {
        (input as any).suspected_type = "Boxer’s fracture";
      }
    }
  } catch (err) {
    console.warn("[handHeuristics] failed to stringify input", err);
  }

  return input;
}
