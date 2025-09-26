function getConfiguredDelayMs(): number {
  const envSeconds = Number.parseInt(process.env.MIN_OUTPUT_DELAY_SECONDS ?? "", 10);
  if (Number.isFinite(envSeconds)) {
    return Math.max(0, envSeconds * 1000);
  }
  return 0;
}

export async function ensureMinDelay<T>(work: Promise<T>, minMs?: number): Promise<T> {
  const floor =
    typeof minMs === "number" && Number.isFinite(minMs)
      ? Math.max(0, Math.floor(minMs))
      : getConfiguredDelayMs();
  const sleeper = new Promise<void>((r) => setTimeout(r, floor));
  const [result] = await Promise.all([work, sleeper]);
  return result;
}

export function minDelayMs(): number {
  return getConfiguredDelayMs();
}
