import { AdCard } from '@/types/ads';
export async function getOtcOffer(region: string): Promise<AdCard|null> {
  return {
    slot: 'inline',
    category: 'otc',
    title: 'Vitamin D3 Supplement — 60 Tabs',
    body: 'Clinically dosed • Free shipping',
    cta: { label: 'Buy Now', url: 'https://example.com/vitd?src=secondop' },
    sponsor: { id: 'pharmacy_inc', name: 'Second Opinion Pharmacy' },
    labels: { sponsored: true, whyThis: 'Mentioned low Vitamin D.' },
    compliance: { contextualOnly: true, region }
  };
}
