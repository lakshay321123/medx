import type { PartnerAdapter } from '@/types/ads';

export const lalAdapter: PartnerAdapter = async ({ region, keywords, category }) => {
  if (category !== 'labs') return null;
  const test = keywords.includes('lipid_profile') ? 'lipid' : 'full-body';
  const url = `https://www.lalpathlabs.com/?utm_source=secondop&utm_medium=chat&utm_term=${test}`;
  return {
    slot: 'inline',
    category,
    title: 'Book Lipid Panel — Home Sample Pickup',
    body: 'Dr. Lal PathLabs · NABL-certified',
    cta: { label: 'Book Test', url },
    sponsor: { id: 'lal', name: 'Dr. Lal PathLabs' },
    labels: { sponsored: true, whyThis: 'You asked about cholesterol / labs.' },
    compliance: { contextualOnly: true, region },
    ttlSeconds: 900,
  };
};
