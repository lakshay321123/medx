'use client';

type TypewriterOptions = {
  charsPerSecond?: number;
  maxBatchSize?: number;
};

export type TypewriterController = {
  enqueue: (text: string) => void;
  flush: () => void;
  reset: (text?: string) => void;
  stop: () => void;
  current: () => string;
};

export function createTypewriter(
  onUpdate: (text: string) => void,
  options: TypewriterOptions = {}
): TypewriterController {
  const cps = Math.max(16, Math.min(120, options.charsPerSecond ?? 54));
  const maxBatch = Math.max(1, Math.min(16, Math.floor(options.maxBatchSize ?? 6)));
  let queue = '';
  let output = '';
  let raf: number | null = null;
  let lastTs = 0;
  let budget = 0;
  let stopped = false;

  const ensureLoop = () => {
    if (stopped) return;
    if (raf !== null) return;
    if (typeof requestAnimationFrame !== 'undefined') {
      lastTs = performance.now();
      raf = requestAnimationFrame(step);
    } else {
      lastTs = Date.now();
      raf = setTimeout(() => step(Date.now()), 16) as unknown as number;
    }
  };

  const cancelLoop = () => {
    if (raf === null) return;
    if (typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(raf);
    } else {
      clearTimeout(raf);
    }
    raf = null;
  };

  const step = (ts: number) => {
    if (stopped) {
      cancelLoop();
      return;
    }
    const elapsed = Math.max(0, ts - lastTs);
    lastTs = ts;
    budget += (elapsed / 1000) * cps;

    if (queue.length > 0) {
      const allowance = Math.min(queue.length, Math.min(maxBatch, Math.floor(budget)) || 1);
      const chunk = queue.slice(0, allowance);
      queue = queue.slice(allowance);
      budget = Math.max(0, budget - allowance);
      output += chunk;
      onUpdate(output);
    }

    if (queue.length > 0) {
      if (typeof requestAnimationFrame !== 'undefined') {
        raf = requestAnimationFrame(step);
      } else {
        raf = setTimeout(() => step(Date.now()), 16) as unknown as number;
      }
    } else {
      cancelLoop();
    }
  };

  const enqueue = (text: string) => {
    if (!text) return;
    queue += text;
    ensureLoop();
  };

  const flush = () => {
    if (!queue) return;
    output += queue;
    queue = '';
    budget = 0;
    onUpdate(output);
    cancelLoop();
  };

  const reset = (text = '') => {
    queue = '';
    output = text;
    budget = 0;
    onUpdate(output);
  };

  const stop = () => {
    stopped = true;
    cancelLoop();
  };

  const current = () => output + queue;

  return { enqueue, flush, reset, stop, current };
}
