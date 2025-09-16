import type {
  EngineeredFeatures,
  MetricWindowStats,
  RiskFactor,
  RuleEvaluation,
  WindowKey,
} from "@/types/prediction";

const WINDOW_KEYS: WindowKey[] = ["days7", "days30", "days90", "days365"];

type RuleDirection = "positive" | "negative";

interface CardiovascularRule {
  id: string;
  label: string;
  weight: number;
  direction?: RuleDirection;
  when: (features: EngineeredFeatures) => boolean;
  detail?: (features: EngineeredFeatures) => string | null | undefined;
}

const normaliseImpactDirection = (weight: number, direction?: RuleDirection): RuleDirection => {
  if (direction) return direction;
  return weight >= 0 ? "positive" : "negative";
};

const getStat = (features: EngineeredFeatures, metric: string, windowKey: WindowKey): MetricWindowStats | undefined => {
  const windows = features.windows ?? {};
  if (windows[windowKey]?.[metric]) {
    return windows[windowKey][metric];
  }
  const flatKey = `${metric}_${windowKey}`;
  const candidate = features[flatKey];
  if (candidate && typeof candidate === "object") {
    return candidate as MetricWindowStats;
  }
  return undefined;
};

const cardiovascularRules: CardiovascularRule[] = [
  {
    id: "ldl_high_mean_90d",
    label: "LDL ↑ (90d mean)",
    weight: 0.22,
    when: (features) => {
      const stat = getStat(features, "ldl", "days90");
      return !!stat && Number.isFinite(stat.mean) && stat.mean > 130;
    },
    detail: (features) => {
      const stat = getStat(features, "ldl", "days90");
      return stat?.mean ? `${Math.round(stat.mean)} mg/dL` : null;
    },
  },
  {
    id: "triglycerides_high_mean_90d",
    label: "Triglycerides ↑",
    weight: 0.16,
    when: (features) => {
      const stat = getStat(features, "triglycerides", "days90");
      return !!stat && Number.isFinite(stat.mean) && stat.mean > 175;
    },
    detail: (features) => {
      const stat = getStat(features, "triglycerides", "days90");
      return stat?.mean ? `${Math.round(stat.mean)} mg/dL` : null;
    },
  },
  {
    id: "hba1c_elevated_chronic",
    label: "HbA1c ↑ (chronic)",
    weight: 0.18,
    when: (features) => {
      const stat = getStat(features, "hba1c", "days365");
      return !!stat && Number.isFinite(stat.mean) && stat.mean >= 6.5;
    },
    detail: (features) => {
      const stat = getStat(features, "hba1c", "days365");
      return stat?.mean ? `${stat.mean.toFixed(1)}%` : null;
    },
  },
  {
    id: "sbp_high_mean_90d",
    label: "SBP ↑",
    weight: 0.18,
    when: (features) => {
      const stat = getStat(features, "sbp", "days90");
      return !!stat && Number.isFinite(stat.mean) && stat.mean >= 140;
    },
    detail: (features) => {
      const stat = getStat(features, "sbp", "days90");
      return stat?.mean ? `${Math.round(stat.mean)} mmHg` : null;
    },
  },
  {
    id: "bmi_obesity_mean_365d",
    label: "BMI obesity range",
    weight: 0.10,
    when: (features) => {
      const stat = getStat(features, "bmi", "days365");
      return !!stat && Number.isFinite(stat.mean) && stat.mean >= 30;
    },
    detail: (features) => {
      const stat = getStat(features, "bmi", "days365");
      return stat?.mean ? `${Math.round(stat.mean)}` : null;
    },
  },
  {
    id: "age_elderly",
    label: "Age ≥ 65",
    weight: 0.10,
    when: (features) => {
      const age = features.demographics?.age;
      return typeof age === "number" && age >= 65;
    },
    detail: (features) => {
      const age = features.demographics?.age;
      return typeof age === "number" ? `${Math.round(age)} yrs` : null;
    },
  },
  {
    id: "encounter_frequent_recent",
    label: "Recurrent acute visits",
    weight: 0.06,
    when: (features) => {
      const stat = getStat(features, "visits", "days90");
      return !!stat && Number.isFinite(stat.count) && stat.count >= 2;
    },
    detail: (features) => {
      const stat = getStat(features, "visits", "days90");
      return stat?.count ? `${stat.count} visits/90d` : null;
    },
  },
];

export function evaluateCardiovascularRisk(features: EngineeredFeatures): RuleEvaluation {
  let score = 0;
  let maxScore = 0;
  const factors: RiskFactor[] = [];

  for (const rule of cardiovascularRules) {
    if (rule.weight > 0) {
      maxScore += rule.weight;
    }
    const triggered = rule.when(features);
    if (triggered) {
      score += rule.weight;
      factors.push({
        name: rule.label,
        impact: rule.weight,
        detail: rule.detail?.(features) ?? null,
        direction: normaliseImpactDirection(rule.weight, rule.direction),
      });
    }
  }

  return { score, factors: factors.sort((a, b) => b.impact - a.impact), maxScore };
}

export { getStat, WINDOW_KEYS };
