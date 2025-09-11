export interface PediatricGrowthInput {
  age_months: number; // age in months
  weight_kg?: number;
}

export interface PediatricGrowthResult {
  age: string;
  weight?: string;
  percentile?: string;
  nutrition: string[];
  red_flags: string[];
}

function ageLabel(months: number): string {
  const years = months / 12;
  if (years >= 1) {
    return `${Number(years.toFixed(1))} years`;
  }
  return `${months} months`;
}

function nutritionTips(months: number): string[] {
  const years = months / 12;
  if (years < 1) return ["Exclusive breastfeeding", "Introduce iron-rich foods at 6 months"];
  if (years <= 3) return ["3 meals + 2 snacks/day", "Include protein foods"];
  return ["Balanced meals", "Limit sugary drinks"];
}

const weight50Table: Record<number, number> = {
  0: 3.3,
  12: 9.6,
  24: 12.2,
  36: 14.3,
  48: 16.3,
  60: 18.3,
};

function interpolatedWeight50(months: number): number {
  const keys = Object.keys(weight50Table).map(Number).sort((a, b) => a - b);
  let lower = keys[0];
  let upper = keys[keys.length - 1];
  for (const k of keys) {
    if (k <= months) lower = k;
    if (k >= months) {
      upper = k;
      break;
    }
  }
  const wLower = weight50Table[lower];
  const wUpper = weight50Table[upper];
  if (lower === upper) return wLower;
  const ratio = (months - lower) / (upper - lower);
  return wLower + (wUpper - wLower) * ratio;
}

export function runPediatricGrowth(i: PediatricGrowthInput): PediatricGrowthResult | null {
  if (process.env.PEDIATRIC_GROWTH_INFO !== 'true') return null;
  const age = ageLabel(i.age_months);
  const nutrition = nutritionTips(i.age_months);
  if (typeof i.weight_kg !== 'number') {
    console.log('metric_pediatric_growth_percentile', { computed: false });
    return { age, nutrition, red_flags: ['Add weight to compute growth percentile'] };
  }
  const weight50 = interpolatedWeight50(i.age_months);
  const rawPercentile = Math.min(100, Math.max(0, (i.weight_kg / weight50) * 50));
  const percentile = Math.round(rawPercentile / 5) * 5;
  const red_flags = percentile < 3 ? ['Weight < 3rd percentile → pediatrician visit'] : [];
  console.log('metric_pediatric_growth_percentile', { computed: true });
  return {
    age,
    weight: `${i.weight_kg}kg`,
    percentile: `${percentile}th`,
    nutrition,
    red_flags,
  };
}

