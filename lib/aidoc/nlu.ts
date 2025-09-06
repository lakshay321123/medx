export const SAID_NO_RX =
  /\b(no|nope|nah|none|nothing|not really)\b|(^|\s)(just|only)\s+(fever|cold|body(\s*)ache|body(\s*)pain|back pain)\b/i;

export type Entities = {
  duration?: string;     // "2 days", "48 hours", "1 week"
  tempC?: number;        // normalized to °C if provided
  painScore?: number;    // 0-10
  location?: string;     // "lower back", "right side", etc.
  spo2Pct?: number;      // e.g., 97
  yesNo?: 'yes' | 'no' | undefined;
};

export function extractEntities(text: string): Entities {
  const t = (text||'').toLowerCase();
  const out: Entities = {};

  const dur = t.match(/\b(\d+(?:\.\d+)?)\s*(d(ays?)?|hrs?|hours?|w(eeks?)?)\b/);
  if (dur) out.duration = dur[0];

  const temp = t.match(/\b(\d{2,3}(?:\.\d+)?)\s*°?\s*([cf]|celsius|fahrenheit)?\b/);
  if (temp) {
    const val = parseFloat(temp[1]); const unit = (temp[2]||'c').toLowerCase();
    out.tempC = unit.startsWith('f') ? Math.round(((val - 32) * 5/9)*10)/10 : val;
  }

  const pain = t.match(/\b(\d(?:\.\d)?)\/10\b|\bpain\s*(\d(?:\.\d)?)\b/);
  const ps = pain ? parseFloat(pain[1] || pain[2]) : NaN;
  if (!Number.isNaN(ps)) out.painScore = Math.max(0, Math.min(10, ps));

  const loc = t.match(/\b(lower back|upper back|left side|right side|one side|radiating.*?(leg|arm))\b/);
  if (loc) out.location = loc[0];

  const spo2 = t.match(/\b(\d{2,3})\s*%\b/);
  const sp = spo2 ? parseInt(spo2[1], 10) : NaN;
  if (!Number.isNaN(sp) && sp <= 100) out.spo2Pct = sp;

  if (SAID_NO_RX.test(t)) out.yesNo = 'no';
  else if (/\b(yes|yep|yeah|affirmative|i do)\b/.test(t)) out.yesNo = 'yes';

  return out;
}
