export function haversineKm(lat1:number, lon1:number, lat2:number, lon2:number){
  const R = 6371; // Earth radius in km
  const toRad = (d:number)=>d*Math.PI/180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R*c;
}

export function osmAmenityFor(term:string):string[]{
  const t = term.toLowerCase();
  if(t.includes('pharm')) return ['pharmacy'];
  if(t.includes('doctor') || t.includes('physician') || t.includes('clinic') || t.includes('hospital')) return ['clinic','doctors','hospital'];
  if(t.includes('dentist')) return ['dentist'];
  return [];
}
