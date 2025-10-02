export const mark = (name: string) => {
  performance.mark(name);
};

type SinceOpts = {
  clearBase?: boolean;
};

export const since = (name: string, opts: SinceOpts = {}) => {
  const nowMark = `${name}:now`;
  performance.mark(nowMark);

  try {
    const measureName = `${name}→${nowMark}`;
    performance.measure(measureName, name, nowMark);
    const [measurement] = performance.getEntriesByName(measureName).slice(-1);

    performance.clearMarks(nowMark);
    performance.clearMeasures(measureName);

    if (opts.clearBase) {
      performance.clearMarks(name);
    }

    return measurement?.duration ?? 0;
  } catch {
    return NaN;
  }
};
