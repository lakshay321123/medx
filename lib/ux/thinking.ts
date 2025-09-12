type ThinkingEvent =
  | { state: "start"; label?: string; minSeconds?: number }
  | { state: "headers"; minSeconds?: number; provider?: string; model?: string }
  | { state: "stop" };

function emit(detail: ThinkingEvent) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("medx-thinking", { detail }));
}

export const thinking = {
  start(label = "Analyzing…", minSeconds?: number) { emit({ state: "start", label, minSeconds }); },
  headers(res: Response) {
    const h = res.headers;
    const ms = Number(h.get("x-medx-min-delay") || "");
    const provider = h.get("x-medx-provider") || undefined;
    const model = h.get("x-medx-model") || undefined;
    if (Number.isFinite(ms)) emit({ state: "headers", minSeconds: ms / 1000, provider, model });
  },
  stop() { emit({ state: "stop" }); }
};
