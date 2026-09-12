import { useEffect, useState } from 'react';

/**
 * Delays a fast-changing value until it settles.
 *
 * Used for search input: one request per pause rather than one per keystroke,
 * which matters when the user is paying for the connection by the megabyte.
 */
export function useDebounced(value, delayMs = 300) {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
