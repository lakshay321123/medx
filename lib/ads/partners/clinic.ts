import { AdCard } from '@/types/ads';
export async function getClinicOffer(region: string): Promise<AdCard|null> {
  return {
    slot: 'inline',
    category: 'clinic',
    title: 'Respiratory Specialist Consultation',
    body: 'Video & in-person • Same-day slots',
    cta: { label: 'Book Visit', url: 'https://example.com/respiratory?src=secondop' },
    sponsor: { id: 'city_care', name: 'CityCare Pulmonology' },
    labels: { sponsored: true, whyThis: 'For cough or breathing symptoms.' },
    compliance: { contextualOnly: true, region }
  };
}
