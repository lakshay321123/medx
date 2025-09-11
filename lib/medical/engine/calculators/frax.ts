export type Inputs = { enabled?: boolean };
export function calc(_: Inputs): never {
  throw new Error("disabled");
}
const def = {
  id: "frax",
  label: "FRAX (10-year fracture risk)",
  inputs: [{ id: "enabled", label: "Enable (env)", type: "boolean" }],
  run: (_args: Inputs) => {
    const enabled = (process.env.FEATURE_FRAX || "").toLowerCase() === "true";
    if (!enabled) {
      return { id: "frax", label: "FRAX (10-year fracture risk)", value: 0, unit: "n/a", precision: 0, notes: ["DISABLED: set FEATURE_FRAX=true"], extra: { enabled: false } };
    }
    // Placeholder for a validated implementation guarded by env flag.
    // Returning a neutral object to avoid runtime errors.
    return { id: "frax", label: "FRAX (10-year fracture risk)", value: 0, unit: "n/a", precision: 0, notes: ["Enabled but not implemented"], extra: { enabled: true } };
  },
};
export default def;
