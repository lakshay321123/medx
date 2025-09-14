export function getPanelFromQueryOrHeaders(req: Request): string | null {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("panel");
    if (q) return q;
  } catch {}
  return req.headers.get("x-panel");
}

