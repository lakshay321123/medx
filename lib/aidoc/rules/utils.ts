export function latestLab(labs: any[], name: string) {
  const needle = name.toLowerCase();
  const cand = (labs||[]).filter(l => String(l.name||"").toLowerCase() === needle);
  cand.sort((a:any,b:any)=> new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
  return cand[0] || null;
}

export function isStale(sample: any, days=90) {
  if (!sample?.takenAt) return true;
  const ageMs = Date.now() - new Date(sample.takenAt).getTime();
  return ageMs > days*24*60*60*1000;
}

export function onMeds(meds:any[], nameLike:string) {
  const n = nameLike.toLowerCase();
  return (meds||[]).some(m => String(m.name||"").toLowerCase().includes(n) && (m.stoppedAt==null));
}

export function parseFloatSafe(x:any): number|undefined {
  if (x==null) return undefined;
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}
