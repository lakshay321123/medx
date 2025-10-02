export const mark = (name: string) => performance.mark(name);
export const since = (start: string) => {
  performance.mark(`${start}:now`);
  performance.measure(start, start, `${start}:now`);
  const [measurement] = performance.getEntriesByName(start).slice(-1);
  performance.clearMarks(start);
  performance.clearMarks(`${start}:now`);
  performance.clearMeasures(start);
  return measurement?.duration ?? 0;
};
