export async function pollJob(route: string, jobId: string, { attempts = 20, interval = 1500 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const normalizedRoute = route.replace(/\/$/, "");
    const res = await fetch(`${normalizedRoute}/status?jobId=${encodeURIComponent(jobId)}`);
    if (!res.ok) {
      throw new Error("Network error");
    }
    let payload: any;
    try {
      payload = await res.json();
    } catch {
      throw new Error("Network error");
    }
    if (payload?.status === "done") {
      return typeof payload.responseText === "string" ? payload.responseText : "";
    }
    if (payload?.status === "error") {
      throw new Error("Network error");
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error("Network error");
}
