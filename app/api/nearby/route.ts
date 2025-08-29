import { NextRequest, NextResponse } from 'next/server';
import { haversineKm, osmAmenityFor } from '../../../addons/nearby/lib/geo';

export async function POST(req: NextRequest){
  if(process.env.FEATURE_NEARBY !== 'on'){
    return NextResponse.json({ disabled: true });
  }
  const { lat, lng, kind } = await req.json();
  if(typeof lat !== 'number' || typeof lng !== 'number'){
    return NextResponse.json([], { status: 400 });
  }
  const amenities = osmAmenityFor(kind || '');
  if(!amenities.length){
    return NextResponse.json([]);
  }
  const query = `[out:json];node(around:3000,${lat},${lng})[amenity~"${amenities.join('|')}"];out;`;
  const upstream = await fetch('https://overpass-api.de/api/interpreter',{ method:'POST', body: query, headers:{'Content-Type':'text/plain'} });
  if(!upstream.ok){
    return NextResponse.json([], { status: 500 });
  }
  const data = await upstream.json();
  const places = (data.elements||[]).map((e:any)=>{
    const dist = haversineKm(lat, lng, e.lat, e.lon);
    const name = e.tags?.name || amenities[0];
    const addr = [e.tags?.['addr:housenumber'], e.tags?.['addr:street'], e.tags?.['addr:city']].filter(Boolean).join(' ');
    return {
      name,
      address: addr,
      distanceKm: Math.round(dist*10)/10,
      mapsUrl: `https://www.openstreetmap.org/${e.type}/${e.id}`,
      navUrl: `https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lon}`
    };
  }).sort((a:any,b:any)=>a.distanceKm - b.distanceKm);
  return NextResponse.json(places);
}
