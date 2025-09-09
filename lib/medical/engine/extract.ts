export type Context = Record<string, any>;

export function extractAll(s: string): Context {
  const t = (s || "").toLowerCase();
  const pickNum = (rx: RegExp) => {
    const m = t.match(rx);
    return m ? Number(m[1]) : undefined;
    };

  const ctx: Context = {};
  ctx.Na = ctx.Na ?? pickNum(/\bna[^0-9]*[:=]?\s*([0-9.]+)/);
  ctx.K = ctx.K ?? pickNum(/\bk[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/);
  ctx.Cl = ctx.Cl ?? pickNum(/\bcl[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/);
  ctx.HCO3 = ctx.HCO3 ?? pickNum(/\b(hco3|bicarb)[^0-9]*[:=]?\s*([0-9.]+)/);
  ctx.albumin = ctx.albumin ?? pickNum(/\balbumin[^0-9]*[:=]?\s*([0-9.]+)/);
  ctx.pCO2 = ctx.pCO2 ?? pickNum(/\b(pco2|pco₂)[^0-9]*[:=]?\s*([0-9.]+)/);
  ctx.glucose_mgdl = ctx.glucose_mgdl ?? pickNum(/\b(glucose|fpg)[^0-9]*[:=]?\s*([0-9.]+)\s*mg\/?dl/);
  ctx.glucose_mmol = ctx.glucose_mmol ?? pickNum(/\b(glucose|fpg)[^0-9]*[:=]?\s*([0-9.]+)\s*mmol/);

  return ctx;
}
