export async function resolveOAUrl(doi: string): Promise<string | null> {
  const email = process.env.UNPAYWALL_EMAIL;
  if (!email) return null;
  const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.best_oa_location?.url ?? null;
}
