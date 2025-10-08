export function normalizeCountry(region: string) {
  if (!region) return '';
  const [country] = region.split('-');
  return (country || '').toLowerCase();
}
