import { normalizeCountry } from '@/lib/ads/geo';
import type { PartnerAdapter } from '@/types/ads';

export const oneMgAdapter: PartnerAdapter = async ({ region, keywords, category }) => {
  if (normalizeCountry(region) !== 'in') return null;
  if (category !== 'otc') return null;

  const q = keywords.includes('lipid_profile') ? 'cholesterol' : 'vitamin d3';
  const url = `https://www.1mg.com/search/all?name=${encodeURIComponent(q)}&utm_source=secondop&utm_medium=chat`;
  return {
    slot: 'inline',
    category,
    title: 'Order Medicines on 1mg',
    body: 'Up-to-date pricing, doorstep delivery',
    cta: { label: 'Open 1mg', url },
    sponsor: { id: '1mg', name: 'Tata 1mg' },
    labels: { sponsored: true, whyThis: 'Contextual suggestion.' },
    compliance: { contextualOnly: true, region },
    ttlSeconds: 900,
  };
};
