import { useEffect, useState } from 'react';

/**
 * Current time that re-renders on an interval — for "Xm ago" badges and
 * staleness checks, which otherwise freeze between SSE messages.
 */
export function useNow(intervalMs: number = 10_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
