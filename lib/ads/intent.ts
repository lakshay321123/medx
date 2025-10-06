export function extractKeywords(msg: string): string[] {
  const m = (msg||'').toLowerCase();
  const kw = new Set<string>();
  if (/\bldl|lipid|cholesterol\b/.test(m)) kw.add('lipid_profile');
  if (/\bvitamin d|25-oh\b/.test(m)) kw.add('vitamin_d');
  if (/\bcough|chest|wheeze\b/.test(m)) kw.add('respiratory');
  if (kw.size===0 && /\btest|report|panel\b/.test(m)) kw.add('labs_generic');
  return [...kw];
}
export function chooseCategory(k: string[]): 'labs'|'otc'|'clinic' {
  if (k.includes('lipid_profile') || k.includes('labs_generic')) return 'labs';
  if (k.includes('vitamin_d')) return 'otc';
  if (k.includes('respiratory')) return 'clinic';
  return 'labs';
}
