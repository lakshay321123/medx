export async function pollJob(route: string, jobId: string, { attempts = 20, interval = 1500 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const normalizedRoute = route.replace(/\/$/, "");
    const res = await fetch(`${normalizedRoute}/status?jobId=${encodeURIComponent(jobId)}`);
    if (!res.ok) {
      throw new Error("Network error");
    }
    const payload = await res.json();
    if (payload?.status === "done") {
      return payload.responseText as string;
    }
    if (payload?.status === "error") {
      throw new Error(typeof payload.errorText === "string" && payload.errorText ? payload.errorText : "Network error");
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error("Network error");
}
