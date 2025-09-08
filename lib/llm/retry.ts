export async function withRetries<T>(
  fn: () => Promise<T>,
  { retries = 2, baseMs = 500 }: { retries?: number; baseMs?: number } = {}
): Promise<T> {
  let last: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i === retries) break;
      const wait = baseMs * 2 ** i + Math.floor(Math.random() * 100);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw last;
}
