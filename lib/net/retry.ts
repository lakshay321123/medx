export type RetryOptions = {
  retries?: number;
  retryDelayMs?: number;
};

const DEFAULT_DELAY = 400;

function shouldRetryStatus(status: number) {
  return status === 429 || status >= 500;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function computeDelay(response: Response | null, attempt: number, baseDelay: number) {
  if (response?.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (!Number.isNaN(seconds) && seconds > 0) {
        return seconds * 1000;
      }
    }
  }
  const jitter = 0.75 + Math.random() * 0.5;
  return Math.round(baseDelay * 2 ** attempt * jitter);
}

export async function retryFetch(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
  options?: RetryOptions,
): Promise<Response> {
  const retries = options?.retries ?? 0;
  const retryDelay = options?.retryDelayMs ?? DEFAULT_DELAY;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let response: Response | null = null;
    try {
      response = await fetch(input, init);
      if (response.ok) {
        return response;
      }
      if (attempt >= retries || !shouldRetryStatus(response.status)) {
        const error = new Error("HTTP error");
        (error as Error & { response?: Response }).response = response;
        throw error;
      }
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
      const wait = computeDelay(
        (error as Error & { response?: Response }).response ?? response,
        attempt,
        retryDelay,
      );
      await delay(wait);
      attempt += 1;
      continue;
    }

    const wait = computeDelay(response, attempt, retryDelay);
    await delay(wait);
    attempt += 1;
  }
}
