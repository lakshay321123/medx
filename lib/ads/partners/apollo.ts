import type { PartnerAdapter, PartnerOffer } from '@/types/ads';

export const apolloAdapter: PartnerAdapter = async ({ region, keywords, category }) => {
  if (category !== 'otc') return null;

  const base = 'https://www.apollopharmacy.in/search-medicines';
  const q = keywords.includes('vitamin_d') ? 'vitamin+d3' : 'omega+3';
  const url = `${base}?q=${encodeURIComponent(q)}&utm_source=secondop&utm_medium=chat&utm_campaign=otc`;

  const offer: PartnerOffer = {
    slot: 'inline',
    category,
    title: 'Vitamin D3 & Essentials — Fast Delivery',
    body: 'Apollo Pharmacy · Genuine meds · Nearby delivery',
    cta: { label: 'Shop on Apollo', url },
    sponsor: { id: 'apollo', name: 'Apollo Pharmacy' },
    labels: { sponsored: true, whyThis: 'You asked about Vitamin D / labs.' },
    compliance: { contextualOnly: true, region },
    ttlSeconds: 900,
  };
  return offer;
};
