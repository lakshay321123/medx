type RetryOptions = {
  retries?: number;
  retryDelayMs?: number;
};

const DEFAULT_RETRY_DELAY_MS = 400;

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
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        attempt += 1;
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      attempt += 1;
    }
  }

  throw lastError ?? new Error("retry_failed");
}
