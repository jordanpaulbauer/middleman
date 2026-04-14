import { useState, useEffect } from 'react';
import { getTimeRemaining } from '../data/demo';

export function useCountdown(endIso) {
  const [time, setTime] = useState(() => getTimeRemaining(endIso));

  useEffect(() => {
    if (!endIso) return;
    const tick = () => setTime(getTimeRemaining(endIso));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endIso]);

  return time;
}
