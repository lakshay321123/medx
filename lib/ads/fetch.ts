export async function fetchAd(args: { text: string; region?: string; tier: 'free'|'100'|'200'|'500'; zone: string }) {
  const res = await fetch('/api/ads/broker', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(args),
  });
  return await res.json();
}
