import { useEffect, useState } from 'react';

/**
 * Tiny countdown for "resend code" buttons.
 * Call `start()` after a successful send; while `active`, show `remaining` seconds
 * and keep the resend action disabled.
 */
export function useResendCooldown(seconds = 60): {
  remaining: number;
  active: boolean;
  start: () => void;
} {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  return {
    remaining,
    active: remaining > 0,
    start: () => setRemaining(seconds),
  };
}
