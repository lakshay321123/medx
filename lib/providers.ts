export type Provider = {
  name: string;
  address: string;
  lat: number;
  lon: number;
  distance: number;
};

export async function nearbyProviders(
  lat: number,
  lon: number,
  type: 'doctor' | 'pharmacy'
): Promise<Provider[]> {
  const radius = 5000; // meters
  const amenity = type === 'pharmacy' ? 'pharmacy' : 'doctors';
  const query = `[out:json];node(around:${radius},${lat},${lon})[amenity=${amenity}];out;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Provider lookup failed');
  const data = await res.json();
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dist = (a: number, b: number, c: number, d: number) => {
    const R = 6371;
    const dLat = toRad(c - a);
    const dLon = toRad(d - b);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  };
  return (data.elements || [])
    .map((e: any) => ({
      name: e.tags?.name || 'Unnamed',
      address: [
        e.tags?.['addr:housenumber'],
        e.tags?.['addr:street'],
        e.tags?.['addr:city'],
      ]
        .filter(Boolean)
        .join(' '),
      lat: e.lat,
      lon: e.lon,
      distance: dist(lat, lon, e.lat, e.lon),
    }))
    .sort((a: any, b: any) => a.distance - b.distance)
    .slice(0, 5);
}
