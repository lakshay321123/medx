const UMLS_LOGIN = "https://utslogin.nlm.nih.gov/cas/v1/api-key";
const UMLS_REST  = "https://uts-ws.nlm.nih.gov/rest";
const UMLS_SERVICE = `${UMLS_REST}`;
let cachedTgt: { url: string; ts: number } | null = null;
const TGT_TTL_MS = 6 * 60 * 60 * 1000;

async function getTGT(apiKey: string): Promise<string> {
  const res = await fetch(UMLS_LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ apikey: apiKey })
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`UMLS TGT error ${res.status}: ${txt}`);
  const m = txt.match(/action="([^"]*\/tickets\/[^\"]+)"/);
  if (!m) throw new Error("UMLS TGT parse failed");
  return m[1];
}
async function getServiceTicket(tgtUrl: string): Promise<string> {
  const res = await fetch(tgtUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ service: UMLS_SERVICE })
  });
  const st = (await res.text()).trim();
  if (!res.ok || !st) throw new Error(`UMLS ST error ${res.status}: ${st || "empty"}`);
  return st;
}
async function ensureTGT(apiKey: string): Promise<string> {
  const now = Date.now();
  if (!cachedTgt || (now - cachedTgt.ts) > TGT_TTL_MS) {
    const url = await getTGT(apiKey);
    cachedTgt = { url, ts: now };
  }
  return cachedTgt.url;
}
export async function umlsFetch(pathAndQuery: string) {
  const apiKey = process.env.UMLS_API_KEY;
  if (!apiKey) throw new Error("UMLS_API_KEY not set");
  let tgt = await ensureTGT(apiKey);
  let st: string;
  try { st = await getServiceTicket(tgt); }
  catch { tgt = await ensureTGT(apiKey); st = await getServiceTicket(tgt); }
  const url = `${UMLS_REST}${pathAndQuery}${pathAndQuery.includes("?") ? "&" : "?"}ticket=${encodeURIComponent(st)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`UMLS fetch error ${res.status}: ${text}`);
  try { return JSON.parse(text); } catch { return { raw:text }; }
}
