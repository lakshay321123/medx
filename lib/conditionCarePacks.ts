import packs from "@/data/condition-care-packs.json";

const LEGAL = "General information only — not medical advice.";

type PackData = {
  lifestyle: string[];
  monitoring: string[];
  adherence: string[];
  red_flags: string[];
  references: Record<string, string[]>;
};

type TranslationMeta = { translation?: string };

export type ConditionCarePack = {
  condition: string;
  lifestyle: string[];
  monitoring: string[];
  adherence: string[];
  red_flags: string[];
  references: string[];
  legal: string;
  meta?: TranslationMeta;
};

export type ConditionCarePackResponse = {
  carePack: ConditionCarePack;
  meta?: TranslationMeta;
};

const map: Record<string, string> = {
  "type 2 diabetes": "type 2 diabetes",
  diabetes: "type 2 diabetes",
  t2d: "type 2 diabetes",
  hypertension: "hypertension",
  "high blood pressure": "hypertension",
  asthma: "asthma",
};

export function normalizeCondition(cond: string): string | null {
  const c = cond.trim().toLowerCase();
  return map[c] || null;
}

export function detectConditionCarePack(text: string): string | null {
  if (process.env.CONDITION_CARE_PACKS !== "true") return null;
  const m = text.toLowerCase().match(/(?:i have|living with|care for|care of)\s+([a-z0-9\s]+)/i);
  if (!m) return null;
  return normalizeCondition(m[1]);
}

export function getConditionCarePack(
  condition: string,
  region = ""
): ConditionCarePackResponse {
  const key = normalizeCondition(condition) || "generic";
  const data: PackData =
    (packs as Record<string, PackData>)[key] ||
    (packs as Record<string, PackData>)["generic"];
  const refs =
    data.references[region.toLowerCase()] ||
    data.references["default"] ||
    [];
  return {
    carePack: {
      condition:
        key === "generic"
          ? "General Chronic Care"
          : key.replace(/(^|\s)\w/g, (s) => s.toUpperCase()),
      lifestyle: data.lifestyle.slice(0, 6),
      monitoring: data.monitoring.slice(0, 6),
      adherence: data.adherence.slice(0, 6),
      red_flags: data.red_flags.slice(0, 6),
      references: refs,
      legal: LEGAL,
    },
  };
}
