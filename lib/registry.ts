export function registryIdLabel(source?: string) {
  const s = (source || "").toUpperCase();
  if (s === "CTGOV") return "NCT ID";
  if (s === "CTRI") return "CTRI ID";
  if (s === "EUCTR") return "EUCTR ID";
  if (s === "ISRCTN") return "ISRCTN";
  return "Registry ID";
}
