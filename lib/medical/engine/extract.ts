// Lightweight numeric scraper from free text or structured strings.
// Keep relaxed patterns so Doctor Mode can paste labs/vitals as plain text.

type Out = Record<string, number | undefined>;

function pickNum(rx: RegExp, s: string): number | undefined {
  const m = s.match(rx);
  if (!m) return undefined;
  const v = Number((m[1] ?? m[0]).replace(/[^\d.+-]/g, ""));
  return Number.isFinite(v) ? v : undefined;
}

export function extractAll(text: string): Out {
  const s = text.toLowerCase();
  const out: Out = {};

  // Basic electrolytes
  out.Na     = pickNum(/\bna[^0-9]*[:=]?\s*([0-9.]+)/, s);
  out.K      = pickNum(/\bk[^a-z0-9]*[:=]?\s*([0-9.]+)/, s);
  out.Cl     = pickNum(/\bcl[^0-9]*[:=]?\s*([0-9.]+)/, s);
  out.HCO3   = pickNum(/\b(hco3|bicarb)[^0-9]*[:=]?\s*([0-9.]+)/, s);
  out.albumin= pickNum(/\balb(?:umin)?[^0-9]*[:=]?\s*([0-9.]+)/, s);
  out.Ca     = pickNum(/\bca[^0-9]*[:=]?\s*([0-9.]+)/, s);

  // Renal
  out.creatinine = pickNum(/\bcreat(?:inine)?[^0-9]*[:=]?\s*([0-9.]+)/, s);
  out.eGFR       = pickNum(/\begfr[^0-9]*[:=]?\s*([0-9.]+)/, s);
  out.BUN        = pickNum(/\bbun[^0-9]*[:=]?\s*([0-9.]+)/, s);

  // Liver
  out.bilirubin = pickNum(/\bbili(?:rubin)?[^0-9]*[:=]?\s*([0-9.]+)/, s);
  out.INR       = pickNum(/\binr[^0-9]*[:=]?\s*([0-9.]+)/, s);

  // Endocrine / glucose
  out.glucose_mgdl = pickNum(/\b(glu|glucose)[^0-9]*[:=]?\s*([0-9.]+)/, s);

  // Gas exchange
  out.PaO2  = pickNum(/\bpao2[^0-9]*[:=]?\s*([0-9.]+)/, s);
  out.PaCO2 = pickNum(/\bpaco2[^0-9]*[:=]?\s*([0-9.]+)/, s);
  out.FiO2  = pickNum(/\bfio2[^0-9]*[:=]?\s*([0-9.]+)/, s);

  // ECG
  out.QT   = pickNum(/\bqt[^0-9]*[:=]?\s*([0-9.]+)/, s);
  out.RR   = pickNum(/\brr[^0-9]*[:=]?\s*([0-9.]+)/, s);
  out.HR   = pickNum(/\bhr[^0-9]*[:=]?\s*([0-9.]+)/, s);

  // Vitals
  out.SBP  = pickNum(/\b(sbp|sys)t?[^0-9]*[:=]?\s*([0-9.]+)/, s);
  out.DBP  = pickNum(/\b(dbp|dia)t?[^0-9]*[:=]?\s*([0-9.]+)/, s);
  out.RRr  = pickNum(/\bresp[^0-9]*[:=]?\s*([0-9.]+)/, s); // respiratory rate

  // Toxicology
  out.ethanol_mgdl = pickNum(/\b(etoh|ethanol)[^0-9]*[:=]?\s*([0-9.]+)/, s);
  out.osm_meas     = pickNum(/\bosm(?:olality| measured)?[^0-9]*[:=]?\s*([0-9.]+)/, s);

  return out;
}

