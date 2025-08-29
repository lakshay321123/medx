// lib/geo.ts
export function haversineKm(a: {lat:number; lng:number}, b: {lat:number; lng:number}) {
  const toRad = (x:number)=>x*Math.PI/180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat/2), sinDLng = Math.sin(dLng/2);
  const h = sinDLat*sinDLat + Math.cos(lat1)*Math.cos(lat2)*sinDLng*sinDLng;
  return 2*R*Math.asin(Math.min(1, Math.sqrt(h)));
}

export function osmAmenityFor(kind: string): string[] {
  const k = (kind || '').toLowerCase();
  if (k.includes('pharm')) return ['pharmacy'];
  if (k.includes('dent')) return ['dentist'];
  if (k.includes('hospital')) return ['hospital'];
  if (k.includes('ent')) return ['clinic','doctors','hospital']; // ENT falls under clinics/doctors
  if (k.includes('doctor') || k.includes('physician') || k.includes('gp')) return ['doctors','clinic','hospital'];
  if (k.includes('clinic')) return ['clinic','doctors'];
  // fallback: common medical amenities
  return ['clinic','doctors','hospital','pharmacy'];
}
