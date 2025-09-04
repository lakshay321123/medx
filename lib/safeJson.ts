export async function safeJson(resPromise: Promise<Response>) {
  const r = await resPromise;
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Request failed ${r.status}: ${text || r.statusText}`);
  }
  return r.json();
}
