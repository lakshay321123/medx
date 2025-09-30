export const PHASES = [
  { value: '1', labelKey: 'Phase 1' },
  { value: '2', labelKey: 'Phase 2' },
  { value: '3', labelKey: 'Phase 3' },
  { value: '4', labelKey: 'Phase 4' },
] as const;

export const STATUSES = [
  { value: 'recruiting', labelKey: 'Recruiting', apiValue: 'Recruiting' },
  { value: 'active', labelKey: 'Active (not recruiting)', apiValue: 'Active, not recruiting' },
  { value: 'completed', labelKey: 'Completed', apiValue: 'Completed' },
  { value: 'any', labelKey: 'Any', apiValue: undefined },
] as const;

export const REGIONS = [
  { value: 'United States', labelKey: 'United States' },
  { value: 'India', labelKey: 'India' },
  { value: 'European Union', labelKey: 'European Union' },
  { value: 'United Kingdom', labelKey: 'United Kingdom' },
  { value: 'Japan', labelKey: 'Japan' },
  { value: 'China', labelKey: 'China' },
  { value: 'Worldwide', labelKey: 'Worldwide' },
] as const;
