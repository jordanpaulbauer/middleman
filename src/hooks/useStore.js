import { useState, useEffect, useCallback } from 'react';
import { subscribe } from '../services';

export function useStore(selector) {
  const [state, setState] = useState(selector);

  useEffect(() => {
    const unsub = subscribe(() => setState(() => selector));
    return unsub;
  }, []);

  const refresh = useCallback(() => setState(() => selector), [selector]);

  return [typeof state === 'function' ? state() : state, refresh];
}

export function useForceUpdate() {
  const [, setTick] = useState(0);
  return useCallback(() => setTick(t => t + 1), []);
}
