// PHQ-9 and GAD-7 local scoring (no diagnosis, only ranges + advise professional help)
export const PHQ9 = {
  items: 9,
  scoreRanges: [
    { max: 4, label: 'minimal' },
    { max: 9, label: 'mild' },
    { max: 14, label: 'moderate' },
    { max: 19, label: 'moderately severe' },
    { max: 27, label: 'severe' }
  ]
};

export const GAD7 = {
  items: 7,
  scoreRanges: [
    { max: 4, label: 'minimal' },
    { max: 9, label: 'mild' },
    { max: 14, label: 'moderate' },
    { max: 21, label: 'severe' }
  ]
};

export function scoreRange(score: number, ranges: {max:number;label:string}[]) {
  for (const r of ranges) if (score <= r.max) return r.label;
  return ranges[ranges.length - 1].label;
}
