import { AdCard } from '@/types/ads';
export async function getLabOffer(region: string): Promise<AdCard|null> {
  return {
    slot: 'inline',
    category: 'labs',
    title: 'Lipid Panel — Home Pickup',
    body: 'NABL-certified • Delhi NCR',
    cta: { label: 'Book Test', url: 'https://example.com/lipid?src=secondop' },
    sponsor: { id: 'srl', name: 'SRL / Dr Lal' },
    labels: { sponsored: true, whyThis: 'You asked about cholesterol.' },
    compliance: { contextualOnly: true, region }
  };
}
