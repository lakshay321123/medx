export function detectYesNo(text: string): 'yes' | 'no' | null {
  const q = text.trim().toLowerCase();
  if (/^(y|ya|yes|yeah|yep)\b/.test(q)) return 'yes';
  if (/^(n|no|noo|nah|none|not really|no other symptoms)\b/.test(q)) return 'no';
  return null;
}

export function parseDuration(text: string): { raw: string; bucket: 'Early' | 'Mid' | 'Late' } | null {
  const q = text.toLowerCase();
  let days: number | null = null;
  let raw = '';
  const m1 = q.match(/(\d+)(?:st|nd|rd|th)?\s*day/);
  if (m1) { days = parseInt(m1[1], 10); raw = m1[0]; }
  const m2 = q.match(/day\s*(\d+)/);
  if (!days && m2) { days = parseInt(m2[1], 10); raw = m2[0]; }
  const m3 = q.match(/d(\d+)/);
  if (!days && m3) { days = parseInt(m3[1], 10); raw = m3[0]; }
  const m4 = q.match(/(\d+)\s*days?/);
  if (!days && m4) { days = parseInt(m4[1], 10); raw = m4[0]; }
  const m5 = q.match(/(\d+)\s*hours?/);
  if (!days && m5) { days = parseInt(m5[1], 10) / 24; raw = m5[0]; }
  const m6 = q.match(/(\d+)\s*week/);
  if (!days && m6) { days = parseInt(m6[1], 10) * 7; raw = m6[0]; }
  if (!days && /since yesterday/.test(q)) { days = 1; raw = 'since yesterday'; }
  if (days == null) return null;
  const bucket = days <= 3 ? 'Early' : days <= 7 ? 'Mid' : 'Late';
  return { raw: raw.trim(), bucket };
}

export function parseTemperature(text: string): { celsius: number; raw: string } | null {
  const m = text.match(/(\d{2,3}(?:\.\d+)?)\s*(?:°\s*)?([cf])/i);
  if (!m) return null;
  const val = parseFloat(m[1]);
  const scale = m[2].toLowerCase();
  const celsius = scale === 'f' ? (val - 32) * 5/9 : val;
  return { celsius: Math.round(celsius * 10) / 10, raw: m[0] };
}

export function parseSpO2(text: string): number | null {
  const m = text.match(/(?:spo2|sats?|oxygen)[^\d]*(\d{2,3})/i);
  if (m) return parseInt(m[1], 10);
  const m2 = text.match(/(\d{2,3})\s*%/);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

export function parsePainScore(text: string): number | null {
  const m = text.match(/pain[^\d]*(\d{1,2})/i);
  if (m) return parseInt(m[1], 10);
  const m2 = text.match(/(\d{1,2})\s*\/\s*10/);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

export function parseLocation(text: string): string | null {
  const m = text.match(/(lower|upper|mid|middle|left|right)[\s-]*(back|spine)/i);
  if (m) return m[0].toLowerCase();
  return null;
}
