import type { PartnerAdapter, PartnerOffer, PartnerOfferInput } from '@/types/ads';
import { lalAdapter } from './partners/lal';
import { apolloAdapter } from './partners/apollo';
import { oneMgAdapter } from './partners/1mg';
import { practoAdapter } from './partners/practo';

const ALL: Record<string, PartnerAdapter> = {
  lal: lalAdapter,
  apollo: apolloAdapter,
  onemg: oneMgAdapter,
  practo: practoAdapter,
};

function partnerOrder(region: string, category: PartnerOfferInput['category']): string[] {
  if (category === 'labs') return ['lal'];
  if (category === 'otc') return ['apollo', 'onemg'];
  if (category === 'clinic') return ['practo'];
  return [];
}

export async function getFirstFill(input: PartnerOfferInput): Promise<PartnerOffer | null> {
  const order = partnerOrder(input.region, input.category);
  const TIMEOUT = 500;

  for (const key of order) {
    const adapter = ALL[key];
    if (!adapter) continue;
    try {
      const p = adapter(input);
      const res = await Promise.race([
        p,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT)),
      ]) as PartnerOffer | null;
      if (res) return res;
    } catch {
      // swallow partner errors
    }
  }

  return null;
}
