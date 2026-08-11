import { useEffect, useState } from 'react';

/** Reloj de pared en vivo, siempre visible; se re-renderiza una vez por segundo. */
export function useStageClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return now;
}
