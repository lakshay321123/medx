import { useEffect, useRef, useState } from "react";

export function useStopwatch(start: boolean) {
  const [ms, setMs] = useState(0);
  const raf = useRef<number | null>(null);
  const t0 = useRef<number>(0);

  useEffect(() => {
    if (!start) {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      setMs(0);
      return;
    }
    t0.current = performance.now();
    const tick = (t: number) => {
      setMs(t - t0.current);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [start]);

  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return { ms, mm, ss };
}
