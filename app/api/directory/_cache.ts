// app/api/directory/_cache.ts
type Entry<T> = { v: T; exp: number };
const store = new Map<string, Entry<unknown>>();
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getCache<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.exp) {
    store.delete(key);
    return undefined;
  }
  return entry.v as T;
}

export function setCache<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, { v: value, exp: Date.now() + ttlMs });
}
