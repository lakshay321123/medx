export const CPC_INR: Record<string, number> = {
  lal: 15,
  srl: 12,
  apollo: 8,
  onemg: 8,
  practo: 14,
};

type PartnerMetrics = {
  imp: number;
  click: number;
};

export const counters: { byPartner: Record<string, PartnerMetrics> } = {
  byPartner: {},
};

export function recordPartnerEvent(partner: string, type: 'impression' | 'click') {
  const key = partner || 'unknown';
  const bucket = (counters.byPartner[key] ??= { imp: 0, click: 0 });
  if (type === 'impression') bucket.imp += 1;
  if (type === 'click') bucket.click += 1;
}

export function getRevenueStats() {
  const partners = Object.entries(counters.byPartner).map(([partner, data]) => {
    const cpc = CPC_INR[partner] ?? 0;
    const revenue = data.click * cpc;
    const ctr = data.imp ? data.click / data.imp : 0;
    return {
      partner,
      impressions: data.imp,
      clicks: data.click,
      ctr,
      cpc,
      estRevenue: revenue,
    };
  });

  const totals = partners.reduce(
    (acc, row) => {
      acc.impressions += row.impressions;
      acc.clicks += row.clicks;
      acc.revenue += row.estRevenue;
      return acc;
    },
    { impressions: 0, clicks: 0, revenue: 0 }
  );

  const ctr = totals.impressions ? totals.clicks / totals.impressions : 0;

  return {
    totals: {
      impressions: totals.impressions,
      clicks: totals.clicks,
      ctr,
      estRevenue: totals.revenue,
    },
    partners,
  };
}
