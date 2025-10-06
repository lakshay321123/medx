export type AdCategory = 'labs' | 'otc' | 'clinic';
export type AdSlot = 'inline' | 'sidebar';
export type UserTier = 'free'|'100'|'200'|'500';

export interface AdContext {
  text: string;  // last user/AI msg (server-side only)
  region: string; // e.g., IN-DL
  tier: UserTier;
  zone: string;  // 'chat' | 'reports' | 'aidoc' | 'directory'
}

export interface AdCard {
  slot: AdSlot;
  category: AdCategory;
  title: string;
  body?: string;
  cta: { label: string; url: string };
  sponsor: { id: string; name: string };
  labels: { sponsored: true; whyThis?: string };
  compliance: { contextualOnly: true; region: string };
}

export interface BrokerResult {
  card?: AdCard;
  reason?: 'disabled'|'zone_blocked'|'freq_cap'|'no_fill';
}
