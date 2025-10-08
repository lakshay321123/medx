import { normalizeCountry } from '@/lib/ads/geo';
import type { PartnerAdapter } from '@/types/ads';

export const apolloAdapter: PartnerAdapter = async ({ region, keywords, category }) => {
  if (normalizeCountry(region) !== 'in') return null;
  if (category !== 'otc') return null;

  const base = 'https://www.apollopharmacy.in/search-medicines';
  const isVitaminD = keywords.includes('vitamin_d');
  const q = isVitaminD ? 'vitamin d3' : 'omega 3';
  const title = isVitaminD
    ? 'Vitamin D3 & Essentials — Fast Delivery'
    : 'Omega-3 Supplements — Fast Delivery';
  const whyThis = isVitaminD
    ? 'You asked about Vitamin D.'
    : 'You asked about Omega-3 supplements.';
  const url = `${base}?q=${encodeURIComponent(q)}&utm_source=secondop&utm_medium=chat&utm_campaign=otc`;

  return {
    slot: 'inline',
    category,
    title,
    body: 'Apollo Pharmacy · Genuine meds · Nearby delivery',
    cta: { label: 'Shop on Apollo', url },
    sponsor: { id: 'apollo', name: 'Apollo Pharmacy' },
    labels: { sponsored: true, whyThis },
    compliance: { contextualOnly: true, region },
    ttlSeconds: 900,
  };
};
