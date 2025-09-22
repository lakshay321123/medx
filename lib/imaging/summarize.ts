export function summarizeImagingFindings(data: any): string {
  if (!data) return "";
  if (data?.type !== "image") return "";

  const findings = data?.findings || {};

  if (findings?.fracture_present === true) {
    const bone = findings.bone || "bone";
    const region = findings.region ? `, ${findings.region}` : "";
    const type = findings.suspected_type ? ` (${findings.suspected_type})` : "";
    const confidence =
      typeof findings.confidence_0_1 === "number"
        ? ` — ${Math.round(findings.confidence_0_1 * 100)}%`
        : "";
    const next = findings.need_additional_views ? "\nNext: Add a side (lateral) view." : "";
    return `Fracture: YES${confidence}\nWhere: ${bone}${region}${type}${next}`;
  }

  if (findings?.fracture_present === false) {
    return "Fracture: NO";
  }

  return "Inconclusive — add a side (lateral) view or clearer image.";
}

