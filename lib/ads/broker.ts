import { AdContext, BrokerResult } from '@/types/ads';
import { extractKeywords, chooseCategory } from './intent';
import { getFirstFill } from './registry';

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
  if (ctx.tier !== 'free' && ctx.tier !== '100') return { reason: 'disabled' };

  const kws = extractKeywords(ctx.text);
  const category = chooseCategory(kws);

  const card = await getFirstFill({
    region: ctx.region,
    keywords: kws,
    category,
  });

  if (!card) return { reason: 'no_fill' };
  return { card };
}
