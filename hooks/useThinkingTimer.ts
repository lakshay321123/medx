// hooks/useThinkingTimer.ts
import { useEffect, useState } from 'react';
export function useThinkingTimer(ms: number) {
  const [left, setLeft] = useState(ms);
  useEffect(() => {
    if (!ms) return;
    const started = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - started;
      const remain = Math.max(0, ms - elapsed);
      setLeft(remain);
      if (remain === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [ms]);
  const seconds = Math.ceil(left / 1000);
  return seconds;
}
