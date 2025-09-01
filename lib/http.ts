// lib/http.ts
import { safeJson } from './safeJson';

export class HttpError extends Error {
  status: number;
  body?: any;
  constructor(msg: string, status = 500, body?: any) {
    super(msg);
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_TIMEOUT_MS = 15000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: ctrl.signal });
    const ct = res.headers.get('content-type') || '';
    let body: any = null;
    if (ct.includes('application/json')) {
      body = await safeJson(res).catch(() => null);
    } else if (ct.includes('text/')) {
      body = await res.text().catch(() => null);
    } else {
      body = await res.arrayBuffer().catch(() => null);
    }
    if (!res.ok) throw new HttpError(`HTTP ${res.status}`, res.status, body);
    return { res, body };
  } finally {
    clearTimeout(id);
  }
}

/** Ensures we always hit an absolute API URL (no more “/api/nearby” from server code). */
export function absolute(base: string | undefined, path: string) {
  const trimmed = (base || '').replace(/\/+$/, '');
  if (!trimmed) throw new Error('NEXT_PUBLIC_BASE_URL not configured');
  return `${trimmed}${path.startsWith('/') ? '' : '/'}${path}`;
}
