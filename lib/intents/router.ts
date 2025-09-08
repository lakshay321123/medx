// Soft-depend on domains detector: if not present, return []
let _detectDomain: ((t: string) => string | null) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _detectDomain = require("@/lib/intents/domains").detectDomain as (t: string)=>string|null;
} catch { /* optional */ }

export function chooseStyles(userText: string, mode: "patient" | "doctor") {
  const d = _detectDomain ? _detectDomain(userText) : null;
  const styles: string[] = [];
  if (mode === "doctor") styles.push("DOCTOR_STYLE"); // OK if missing
  if (d) styles.push((d.toUpperCase() + "_STYLE") as string);
  return styles;
}
