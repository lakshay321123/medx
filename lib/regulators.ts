export type RegSource = { name: string; short: string; site: string; country?: string; region?: string };

export const REGULATORS: RegSource[] = [
  { name: 'Central Drugs Standard Control Organization', short: 'CDSCO', site: 'https://cdsco.gov.in', country: 'IN' },
  { name: 'National Health Authority', short: 'NHA', site: 'https://nha.gov.in', country: 'IN' },
  { name: 'European Medicines Agency', short: 'EMA', site: 'https://www.ema.europa.eu', region: 'EU' },
  { name: 'Medicines and Healthcare products Regulatory Agency', short: 'MHRA', site: 'https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency', country: 'GB' },
  { name: 'U.S. Food & Drug Administration', short: 'FDA', site: 'https://www.fda.gov', country: 'US' },
  { name: 'Therapeutic Goods Administration', short: 'TGA', site: 'https://www.tga.gov.au', country: 'AU' },
  { name: 'Health Canada', short: 'HC', site: 'https://www.canada.ca/en/health-canada.html', country: 'CA' },
  { name: 'Health Sciences Authority', short: 'HSA', site: 'https://www.hsa.gov.sg', country: 'SG' },
  { name: 'World Health Organization', short: 'WHO', site: 'https://www.who.int' },
];

export function pickRegulators(countryCode?: string) {
  const cc = (countryCode || 'US').toUpperCase();
  const local = REGULATORS.filter(r => r.country === cc);
  const region = cc === 'DE' || cc === 'FR' || cc === 'ES' || cc === 'IT' ? REGULATORS.filter(r => r.region === 'EU') : [];
  const globals = REGULATORS.filter(r => !r.country && !r.region);
  const us = cc === 'US' ? [] : REGULATORS.filter(r => r.country === 'US');
  return [...local, ...region, ...globals, ...us];
}
