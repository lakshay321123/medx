export function normalizePhase(p?: string): string | undefined {
  if (!p) return undefined;
  const m = /phase\s*([1-4]|i{1,3}|iv)/i.exec(p);
  if (!m) return undefined;
  const val = m[1].toLowerCase();
  const map: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4' };
  const num = map[val] || val;
  return `Phase ${num}`;
}

export function normalizeStatus(s?: string): string | undefined {
  if (!s) return undefined;
  const map: Record<string, string> = {
    recruiting: 'Recruiting',
    'enrolling by invitation': 'Enrolling by invitation',
    'active, not recruiting': 'Active, not recruiting',
    'not yet recruiting': 'Not yet recruiting',
    completed: 'Completed',
  };
  const k = s.trim().toLowerCase();
  return map[k] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : undefined);
}

export function defaultTrialFilters(broaden = false) {
  return {
    phase: broaden ? 'Phase 1,Phase 2,Phase 3' : 'Phase 2,Phase 3',
    status: broaden
      ? 'Recruiting,Enrolling by invitation,Active,Not yet recruiting,Completed'
      : 'Recruiting,Enrolling by invitation',
  };
}
