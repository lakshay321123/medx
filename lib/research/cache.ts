const mem = new Map<string, { data: any; exp: number }>();
export async function getCached<T>(key: string): Promise<T | undefined> {
  const hit = mem.get(key);
  if (!hit || Date.now() > hit.exp) return undefined;
  return hit.data as T;
}
export async function setCached<T>(key: string, data: T, ttlSec = 900) {
  mem.set(key, { data, exp: Date.now() + ttlSec * 1000 });
}
export function tkey(source: string, q: string) {
  return `${source}:${q.toLowerCase()}`.slice(0, 500);
}
