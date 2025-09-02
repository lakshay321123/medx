const HF = process.env.HF_API_TOKEN || "";

async function callBytes(buf: Buffer, modelId: string) {
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(modelId)}`;
  const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${HF}` }, body: buf });
  const txt = await r.text();
  return { ok: r.ok, status: r.status, txt };
}

async function callJsonBase64(buf: Buffer, modelId: string) {
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(modelId)}`;
  const payload = { inputs: buf.toString("base64") };
  const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${HF}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const txt = await r.text();
  return { ok: r.ok, status: r.status, txt };
}

export async function runHF(buf: Buffer, modelId: string, prefer: "bytes"|"json_base64" = "bytes") {
  const first = prefer === "bytes" ? await callBytes(buf, modelId) : await callJsonBase64(buf, modelId);

  // cold start
  if (first.status === 503) {
    await new Promise(r => setTimeout(r, 2000));
    return prefer === "bytes" ? await callBytes(buf, modelId) : await callJsonBase64(buf, modelId);
  }

  // format mismatch fallback
  if (!first.ok && first.status === 400) {
    const alt = prefer === "bytes" ? await callJsonBase64(buf, modelId) : await callBytes(buf, modelId);
    if (alt.ok) return alt;
  }

  return first;
}

export function parseHF(txt: string) {
  try { return JSON.parse(txt); } catch { return txt; }
}
