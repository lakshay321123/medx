export async function getUserPosition() {
  if (!("geolocation" in navigator)) return null;
  return new Promise<{ lat: number; lon: number }>((res) => {
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => res(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 }
    );
  });
}

export async function fetchNearby(kind: string, lat: number, lon: number, radius = 2000) {
  const qs = new URLSearchParams({ type: kind, lat: String(lat), lon: String(lon), radius: String(radius) });
  const r = await fetch(`/api/nearby?${qs.toString()}`);
  return await r.json();
}
