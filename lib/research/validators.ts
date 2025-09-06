export function isTrial(c: any): boolean {
  const src = String(c.source || "").toLowerCase();
  return src === "ctgov" || src === "ctri" || src === "ictrp";
}

export function hasRegistryId(c: any): boolean {
  const id = String(c.id || "");
  return /\bNCT\d{8}\b/.test(id) || /\bCTRI\/\d{4}\/\d{2}\/\d{6}\b/i.test(id) || /^[A-Z0-9-]{6,}$/.test(id);
}

export function matchesPhase(c: any, phase?: "1"|"2"|"3"|"4"): boolean {
  if (!phase) return true;
  const p = String(c.extra?.phase || "").toUpperCase();
  const roman = ["I","II","III","IV"][parseInt(phase)-1];
  return p.includes(roman);
}

export function matchesRecruiting(c: any, recruiting?: boolean): boolean {
  if (recruiting !== true) return true;
  return !!c.extra?.recruiting;
}

export function matchesCountry(c: any, country?: string): boolean {
  if (!country) return true;
  const inItem = String(c.extra?.country || c.extra?.location || "").toLowerCase();
  return inItem.includes(country.toLowerCase());
}
