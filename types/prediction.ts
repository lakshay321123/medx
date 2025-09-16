export type RiskLabel = "Low" | "Moderate" | "High";

export type WindowKey = "days7" | "days30" | "days90" | "days365";

export interface WindowStatOptions {
  normalRange?: [number | null, number | null];
}

export interface MetricWindowStats {
  n: number;
  count: number;
  mean: number;
  min: number;
  max: number;
  std: number;
  slope: number;
  first?: number;
  last?: number;
  firstObservedAt?: string;
  lastObservedAt?: string;
  timeSinceLast?: number;
  percentOutOfRange?: number;
  timeSinceLastNormal?: number;
}

export type WindowSnapshot = Record<string, MetricWindowStats>;

export interface PatientDemographics {
  age?: number | null;
  sex?: string | null;
}

export interface FeatureBuilderInput {
  vitals: any[];
  labs: any[];
  meds: any[];
  notes: any[];
  encounters: any[];
  demographics?: PatientDemographics;
}

export interface EngineeredFeatures {
  windows: Record<WindowKey, WindowSnapshot>;
  demographics?: PatientDemographics;
  counts?: Record<string, number>;
  missing?: string[];
  [key: string]:
    | MetricWindowStats
    | WindowSnapshot
    | PatientDemographics
    | Record<string, number>
    | string[]
    | undefined;
}

export interface RiskFactor {
  name: string;
  impact: number;
  detail?: string | null;
  direction?: "positive" | "negative";
}

export interface PredictionContext {
  featureCount: number;
  missing?: string[];
  demographicSummary?: string;
}

export interface PredictionResult {
  condition: string;
  riskScore: number;
  riskLabel: RiskLabel;
  topFactors: RiskFactor[];
  windows: Record<WindowKey, WindowSnapshot>;
  generatedAt: string;
  context?: PredictionContext;
}

export interface RuleEvaluation {
  score: number;
  factors: RiskFactor[];
  maxScore: number;
}
