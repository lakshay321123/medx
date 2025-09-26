export interface TypewriterOptions {
  /** Minimum characters to reveal per frame when characters are available */
  minBatch?: number;
  /** Maximum characters to reveal per frame */
  maxBatch?: number;
  /** Approximate characters per second to reveal */
  charsPerSecond?: number;
}

export interface TypewriterController {
  enqueue(text: string): void;
  flush(): Promise<void>;
  cancel(): void;
  reset(initialText?: string): void;
}

const DEFAULT_OPTIONS: Required<TypewriterOptions> = {
  minBatch: 4,
  maxBatch: 6,
  charsPerSecond: 50,
};

function createImmediateController(
  onUpdate: (value: string) => void,
  options: Required<TypewriterOptions>,
): TypewriterController {
  let output = "";
  return {
    enqueue(text: string) {
      if (!text) return;
      output += text;
      onUpdate(output);
    },
    async flush() {
      return Promise.resolve();
    },
    cancel() {
      output = "";
    },
    reset(initialText = "") {
      output = initialText;
      onUpdate(output);
    },
  };
}

export function createTypewriter(
  onUpdate: (value: string) => void,
  options: TypewriterOptions = {},
): TypewriterController {
  const resolved: Required<TypewriterOptions> = {
    minBatch: Math.max(1, options.minBatch ?? DEFAULT_OPTIONS.minBatch),
    maxBatch: Math.max(1, options.maxBatch ?? DEFAULT_OPTIONS.maxBatch),
    charsPerSecond: Math.max(1, options.charsPerSecond ?? DEFAULT_OPTIONS.charsPerSecond),
  };

  if (typeof window === "undefined" || typeof window.requestAnimationFrame === "undefined") {
    return createImmediateController(onUpdate, resolved);
  }

  let queue = "";
  let output = "";
  let rafId = 0;
  let running = false;
  let lastTime = 0;
  let budget = 0;
  let flushRequested = false;
  let flushResolver: (() => void) | null = null;

  const ensureRunning = () => {
    if (running) return;
    running = true;
    lastTime = window.performance?.now?.() ?? Date.now();
    rafId = window.requestAnimationFrame(loop);
  };

  const stopRunning = () => {
    if (!running) return;
    running = false;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  const resolveFlush = () => {
    if (flushResolver) {
      const resolve = flushResolver;
      flushResolver = null;
      resolve();
    }
  };

  const loop = (time: number) => {
    if (!running) return;

    const delta = Math.max(0, time - lastTime);
    lastTime = time;

    budget += (delta / 1000) * resolved.charsPerSecond;

    if (flushRequested && queue.length > 0) {
      budget = Math.max(budget, resolved.minBatch);
      budget += queue.length;
    }

    let didUpdate = false;

    while (queue.length > 0 && (budget >= resolved.minBatch || flushRequested)) {
      const allowable = flushRequested
        ? Math.min(queue.length, Math.max(resolved.minBatch, Math.min(resolved.maxBatch, queue.length)))
        : Math.min(
            queue.length,
            Math.min(resolved.maxBatch, Math.max(resolved.minBatch, Math.floor(budget))),
          );

      const chunk = queue.slice(0, allowable);
      queue = queue.slice(allowable);
      output += chunk;
      budget = Math.max(0, budget - allowable);
      didUpdate = true;
    }

    if (didUpdate) {
      onUpdate(output);
    }

    if (queue.length === 0) {
      if (flushRequested) {
        flushRequested = false;
        resolveFlush();
      }
      stopRunning();
      budget = 0;
      return;
    }

    rafId = window.requestAnimationFrame(loop);
  };

  return {
    enqueue(text: string) {
      if (!text) return;
      queue += text;
      ensureRunning();
    },
    flush() {
      if (queue.length === 0) {
        flushRequested = false;
        resolveFlush();
        return Promise.resolve();
      }
      flushRequested = true;
      ensureRunning();
      return new Promise<void>(resolve => {
        flushResolver = resolve;
      });
    },
    cancel() {
      queue = "";
      flushRequested = false;
      resolveFlush();
      stopRunning();
    },
    reset(initialText = "") {
      queue = "";
      output = initialText;
      budget = 0;
      flushRequested = false;
      stopRunning();
      onUpdate(output);
    },
  };
}

export type { TypewriterController };
