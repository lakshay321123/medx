import crypto from "crypto";

export async function embed(text: string): Promise<number[]> {
  // TODO: Swap with real embeddings (OpenAI, Cohere, etc.)
  // Temporary deterministic pseudo-embedding: hash -> 256 dims
  const hash = crypto.createHash("sha256").update(text).digest();
  const arr = Array.from(hash).map((x) => (x - 128) / 128);
  // Repeat to 256 dims
  const dims = 256;
  const v: number[] = [];
  while (v.length < dims) v.push(...arr);
  return v.slice(0, dims);
}

export function cosine(a: number[], b: number[]): number {
  const min = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < min; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
