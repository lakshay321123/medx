// addons/nearby/lib/geo.ts
export function haversineKm(lat1:number, lon1:number, lat2:number, lon2:number){
  const R = 6371; // km
  const toRad = (d:number)=>d*Math.PI/180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/**
 * Map loose user terms to OSM amenity tags.
 * e.g. "docs near me" => ['doctors','clinic','hospital']
 */
export function osmAmenityFor(term: string): string[] {
  const t = (term || '').toLowerCase();

  // doctor synonyms
  if (/\b(doc|docs|doctor|doctors|gp|physician|family doctor)\b/.test(t)) {
    return ['doctors', 'clinic', 'hospital'];
  }

  // pharmacy synonyms
  if (/\b(pharm|pharmacy|chemist|drugstore|medical shop|medical store)\b/.test(t)) {
    return ['pharmacy'];
  }

  // clinic synonyms
  if (/\b(clinic|polyclinic|urgent care|health centre|health center)\b/.test(t)) {
    return ['clinic', 'hospital', 'doctors'];
  }

  // hospital synonyms
  if (/\b(hosp|hospital|medical center|medical centre|er|emergency)\b/.test(t)) {
    return ['hospital', 'clinic', 'doctors'];
  }

  // default: try broadly like "doctors"
  return ['doctors', 'clinic', 'hospital'];
}
