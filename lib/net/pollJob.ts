export type PollJobOptions = {
  attempts?: number;
  interval?: number;
};

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export type PollJobResult = {
  payload: any;
  responseText: string;
};

export async function pollJob(route: string, jobId: string, options: PollJobOptions = {}): Promise<PollJobResult> {
  const attempts = options.attempts ?? 20;
  const interval = options.interval ?? 1500;

  for (let i = 0; i < attempts; i += 1) {
    const res = await fetch(`${route}/status?jobId=${encodeURIComponent(jobId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error("Network error");
    }
    const data = await res.json();
    if (data?.status === "done") {
      const payload = data.payload ?? {};
      const text =
        typeof data.responseText === "string"
          ? data.responseText
          : typeof payload?.text === "string"
          ? payload.text
          : typeof payload?.reply === "string"
          ? payload.reply
          : "";
      return { payload, responseText: text };
    }
    if (data?.status === "error") {
      const error = new Error(data?.errorText || "Network error");
      (error as Error & { payload?: any }).payload = data?.payload;
      throw error;
    }
    await sleep(interval);
  }

  throw new Error("Network error");
}
