const store = new Map<string, { v: any, exp: number }>();

export function cacheGet(key: string) {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.exp) { store.delete(key); return undefined; }
  return hit.v;
}

export function cacheSet(key: string, v: any, ttlMs: number) {
  store.set(key, { v, exp: Date.now() + ttlMs });
}
