import { detectDomain } from "@/lib/intents/domains";

export function chooseStyles(userText: string, mode: "patient" | "doctor") {
  const d = detectDomain(userText);
  const styles: string[] = [];
  if (mode === "doctor") styles.push("DOCTOR_STYLE");
  if (d) styles.push(`${d.toUpperCase()}_STYLE`);
  return styles;
}
