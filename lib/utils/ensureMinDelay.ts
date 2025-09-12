export async function ensureMinDelay<T>(work: Promise<T>, minMs?: number): Promise<T> {
  const floor =
    typeof minMs === "number" && Number.isFinite(minMs)
      ? Math.max(0, Math.floor(minMs))
      : Math.max(0, (parseInt(process.env.MIN_OUTPUT_DELAY_SECONDS || "", 10) || 10) * 1000);
  const sleeper = new Promise<void>((r) => setTimeout(r, floor));
  const [result] = await Promise.all([work, sleeper]);
  return result;
}

export function minDelayMs(): number {
  return Math.max(0, (parseInt(process.env.MIN_OUTPUT_DELAY_SECONDS || "", 10) || 10) * 1000);
}
