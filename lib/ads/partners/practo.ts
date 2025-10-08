import { normalizeCountry } from '@/lib/ads/geo';
import type { PartnerAdapter } from '@/types/ads';

export const practoAdapter: PartnerAdapter = async ({ region, keywords, category }) => {
  if (normalizeCountry(region) !== 'in') return null;
  if (category !== 'clinic') return null;
  const url = 'https://www.practo.com/?utm_source=secondop&utm_medium=chat';
  return {
    slot: 'inline',
    category,
    title: 'Book Nearby Doctor Consultation',
    body: 'Practo · Verified doctors & clinics',
    cta: { label: 'Find a Doctor', url },
    sponsor: { id: 'practo', name: 'Practo' },
    labels: { sponsored: true, whyThis: 'You asked about symptoms/consults.' },
    compliance: { contextualOnly: true, region },
    ttlSeconds: 900,
  };
};
