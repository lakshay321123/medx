import { AdContext, BrokerResult } from '@/types/ads';
import { extractKeywords, chooseCategory } from './intent';
import { getLabOffer } from './partners/labs';
import { getOtcOffer } from './partners/otc';
import { getClinicOffer } from './partners/clinic';

function flag(name:string, def=''): string {
  const v = process.env[name];
  return (v===undefined || v===null) ? def : v;
}
function bool(name:string, def=false): boolean {
  const v = flag(name);
  return v ? ['1','true','yes','on'].includes(v.toLowerCase()) : def;
}

export async function broker(ctx: AdContext): Promise<BrokerResult> {
  if (!bool('ADS_ENABLED')) return { reason: 'disabled' };
  const noZones = flag('ADS_NO_ZONES','').split(',').map(s=>s.trim()).filter(Boolean);
  if (noZones.includes(ctx.zone)) return { reason: 'zone_blocked' };
  if (!(['free','100'] as const).includes(ctx.tier)) return { reason: 'disabled' };

  const kws = extractKeywords(ctx.text);
  const cat = chooseCategory(kws);
  let card = null;
  if (cat==='labs') card = await getLabOffer(ctx.region);
  else if (cat==='otc') card = await getOtcOffer(ctx.region);
  else card = await getClinicOffer(ctx.region);

  if (!card) return { reason: 'no_fill' };
  return { card };
}
