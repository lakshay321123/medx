type RetryOptions = {
  retries?: number;
  retryDelayMs?: number;
};

const DEFAULT_RETRY_DELAY_MS = 400;

const computeDelay = (res: Response | null, attempt: number, base: number) => {
  if (res?.status === 429) {
    const retryAfter = res.headers.get("retry-after");
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (!Number.isNaN(seconds) && seconds > 0) {
        return seconds * 1000;
      }
    }
  }
  return Math.round(base * 2 ** attempt * (0.75 + Math.random() * 0.5));
};

function shouldRetryResponse(response: Response) {
  return response.status === 429 || response.status >= 500;
}

export async function retryFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: RetryOptions,
) {
  const { retries = 0, retryDelayMs = DEFAULT_RETRY_DELAY_MS } = options ?? {};
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= retries) {
    try {
      const response = await fetch(input, init);
      if (attempt < retries && shouldRetryResponse(response)) {
        const delay = computeDelay(response, attempt, retryDelayMs);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt += 1;
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) {
        throw error;
      }
      const delay = computeDelay(null, attempt, retryDelayMs);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt += 1;
    }
  }

  throw lastError ?? new Error("retry_failed");
}
