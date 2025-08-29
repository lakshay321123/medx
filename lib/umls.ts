const UMLS_LOGIN = "https://utslogin.nlm.nih.gov/cas/v1/api-key";
const UMLS_REST  = "https://uts-ws.nlm.nih.gov/rest";
const UMLS_SERVICE = `${UMLS_REST}`;

async function getTGT(apiKey: string): Promise<string> {
  const res = await fetch(UMLS_LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ apikey: apiKey })
  });
  if (!res.ok) throw new Error(`UMLS TGT error ${res.status}`);
  const txt = await res.text();
  const m = txt.match(/action="([^"]*\/tickets\/[^"]+)"/);
  if (!m) throw new Error("UMLS TGT parse failed");
  return m[1];
}

async function getServiceTicket(tgtUrl: string): Promise<string> {
  const res = await fetch(tgtUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ service: UMLS_SERVICE })
  });
  if (!res.ok) throw new Error(`UMLS ST error ${res.status}`);
  const st = (await res.text()).trim();
  if (!st) throw new Error("Empty UMLS service ticket");
  return st;
}

export async function umlsFetch(pathAndQuery: string) {
  const apiKey = process.env.UMLS_API_KEY;
  if (!apiKey) throw new Error("UMLS_API_KEY not set");

  const g = globalThis as any;
  g.__UMLS_TGT__ = g.__UMLS_TGT__ || null;
  let tgt = g.__UMLS_TGT__;
  if (!tgt) { tgt = await getTGT(apiKey); g.__UMLS_TGT__ = tgt; }

  let st: string;
  try { st = await getServiceTicket(tgt); }
  catch { tgt = await getTGT(apiKey); g.__UMLS_TGT__ = tgt; st = await getServiceTicket(tgt); }

  const url = `${UMLS_REST}${pathAndQuery}${pathAndQuery.includes("?") ? "&" : "?"}ticket=${encodeURIComponent(st)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`UMLS fetch error ${res.status}: ${t}`);
  }
  return res.json();
}
