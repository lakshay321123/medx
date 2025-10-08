import { normalizeCountry } from '@/lib/ads/geo';
import type { PartnerAdapter } from '@/types/ads';

export const lalAdapter: PartnerAdapter = async ({ region, keywords, category }) => {
  if (normalizeCountry(region) !== 'in') return null;
  if (category !== 'labs') return null;
  const test = keywords.includes('lipid_profile') ? 'lipid' : 'full-body';
  const title =
    test === 'lipid'
      ? 'Book Lipid Panel — Home Sample Pickup'
      : 'Book Full Body Checkup — Home Sample Pickup';

  const url = `https://www.lalpathlabs.com/?utm_source=secondop&utm_medium=chat&utm_term=${encodeURIComponent(test)}`;
  return {
    slot: 'inline',
    category,
    title,
    body: 'Dr. Lal PathLabs · NABL-certified',
    cta: { label: 'Book Test', url },
    sponsor: { id: 'lal', name: 'Dr. Lal PathLabs' },
    labels: { sponsored: true, whyThis: 'Top match for your request.' },
    compliance: { contextualOnly: true, region },
    ttlSeconds: 900,
  };
};
