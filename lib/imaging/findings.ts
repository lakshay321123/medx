export type ImagingFindings = {
  fracture_present: boolean | null;
  suspected_type: string | null;
  bone: string | null;
  region: string | null;
  angulation_deg: number | null;
  displacement_mm: number | null;
  rotation_suspected: boolean | null;
  need_additional_views: boolean | null;
  red_flags: string[];
  confidence_0_1: number;
  confidence_calibrated: number | null;
  decision_tier: "YES" | "Likely" | "Inconclusive" | null;
};

export const BASE_FINDINGS: ImagingFindings = {
  fracture_present: null,
  suspected_type: null,
  bone: null,
  region: null,
  angulation_deg: null,
  displacement_mm: null,
  rotation_suspected: null,
  need_additional_views: null,
  red_flags: [],
  confidence_0_1: 0,
  confidence_calibrated: null,
  decision_tier: null,
};

export const UNCLEAR_IMAGE_WARNING =
  "Image unclear. Please add a side view or higher resolution photo.";

export function normalizeFindings(
  raw: string | null | undefined,
): { findings: ImagingFindings; warning: string | null } {
  const findings: ImagingFindings = { ...BASE_FINDINGS };
  if (!raw) {
    return { findings, warning: UNCLEAR_IMAGE_WARNING };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { findings, warning: UNCLEAR_IMAGE_WARNING };
  }

  if (!parsed || typeof parsed !== "object") {
    return { findings, warning: UNCLEAR_IMAGE_WARNING };
  }

  const data = parsed as Record<string, unknown>;
  let hasSignal = false;

  if (typeof data.fracture_present === "boolean") {
    findings.fracture_present = data.fracture_present;
    hasSignal = true;
  }

  if (typeof data.suspected_type === "string" && data.suspected_type.trim()) {
    findings.suspected_type = data.suspected_type.trim();
    hasSignal = true;
  }

  if (typeof data.bone === "string" && data.bone.trim()) {
    findings.bone = data.bone.trim();
    hasSignal = true;
  }

  if (typeof data.region === "string" && data.region.trim()) {
    findings.region = data.region.trim();
    hasSignal = true;
  }

  if (typeof data.angulation_deg === "number" && Number.isFinite(data.angulation_deg)) {
    findings.angulation_deg = data.angulation_deg;
    hasSignal = true;
  }

  if (typeof data.displacement_mm === "number" && Number.isFinite(data.displacement_mm)) {
    findings.displacement_mm = data.displacement_mm;
    hasSignal = true;
  }

  if (typeof data.rotation_suspected === "boolean") {
    findings.rotation_suspected = data.rotation_suspected;
    hasSignal = true;
  }

  if (typeof data.need_additional_views === "boolean") {
    findings.need_additional_views = data.need_additional_views;
    hasSignal = true;
  }

  if (Array.isArray(data.red_flags)) {
    const redFlags = data.red_flags
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map(item => item.trim());
    if (redFlags.length > 0) {
      findings.red_flags = redFlags;
      hasSignal = true;
    }
  }

  if (typeof data.confidence_0_1 === "number" && Number.isFinite(data.confidence_0_1)) {
    const clamped = Math.min(1, Math.max(0, data.confidence_0_1));
    findings.confidence_0_1 = clamped;
    hasSignal = true;
  }

  if (typeof data.confidence_calibrated === "number" && Number.isFinite(data.confidence_calibrated)) {
    findings.confidence_calibrated = Math.min(1, Math.max(0, data.confidence_calibrated));
    hasSignal = true;
  }

  if (typeof data.decision_tier === "string") {
    const normalized = data.decision_tier.trim();
    if (["YES", "Likely", "Inconclusive"].includes(normalized)) {
      findings.decision_tier = normalized as ImagingFindings["decision_tier"];
      hasSignal = true;
    }
  }

  if (!hasSignal) {
    return { findings, warning: UNCLEAR_IMAGE_WARNING };
  }

  return { findings, warning: null };
}
