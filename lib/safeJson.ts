export async function safeJson(res: Response) {
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch {
    return { ok: res.ok, raw: txt };
  }
}
