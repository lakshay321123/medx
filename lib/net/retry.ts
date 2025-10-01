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
    try {
      const response = await fetch(input, init);
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
      await delay(retryDelay * Math.max(1, attempt + 1));
      attempt += 1;
      continue;
    }

    await delay(retryDelay * Math.max(1, attempt + 1));
    attempt += 1;
  }
}
