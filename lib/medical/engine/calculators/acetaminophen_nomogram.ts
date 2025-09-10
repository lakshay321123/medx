export interface RumackInput {
  hours_post_ingestion: number;
  acetaminophen_ug_mL: number; // mcg/mL same as ug/mL
}

export function rumackMatthewThreshold(i: RumackInput) {
  // Standard 150-line from 4 to 24 h: value (ug/mL) = 150 * 2^(-(t-4)/4)
  const t = i.hours_post_ingestion;
  let threshold = NaN;
  if (t >= 4 && t <= 24) {
    threshold = 150 * Math.pow(2, -((t - 4) / 4));
  }
  const above = (isFinite(threshold) && i.acetaminophen_ug_mL >= threshold) || (t > 24 && i.acetaminophen_ug_mL > 10);
  return { treatment_line_ug_mL: Math.round(threshold), above_line: above };
}
