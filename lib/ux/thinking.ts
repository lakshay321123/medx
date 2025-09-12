type ThinkingEvent =
  | { state: "start"; label?: string; minSeconds?: number }
  | { state: "headers"; minSeconds?: number; provider?: string; model?: string }
  | { state: "stop" };

function emit(detail: ThinkingEvent) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<ThinkingEvent>("medx-thinking", { detail }));
  }
}

export const thinking = {
  start(label = "Analyzing…", minSeconds?: number) {
    emit({ state: "start", label, minSeconds });
  },
  headers(res: Response | { headers?: Headers }) {
    try {
      const h = (res as Response).headers;
      if (!h) return;
      const min = Number(h.get("x-medx-min-delay") || "");
      const provider = h.get("x-medx-provider") || undefined;
      const model = h.get("x-medx-model") || undefined;
      if (Number.isFinite(min)) emit({ state: "headers", minSeconds: min / 1000, provider, model });
    } catch {}
  },
  stop() {
    emit({ state: "stop" });
  },
};

