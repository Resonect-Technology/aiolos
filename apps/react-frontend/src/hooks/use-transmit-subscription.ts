import { useEffect, useRef, useState } from 'react';
import type { z } from 'zod';

import { transmit } from '../lib/transmit';

/**
 * Subscribe to a Transmit (SSE) channel for the lifetime of the component,
 * validating every payload against a zod schema before it reaches the caller.
 *
 * Some backend paths wrap the payload in { data }, so a failed parse retries
 * against that wrapper before giving up with a console.warn. The latest
 * callbacks are kept in refs so callers don't need useCallback and the
 * subscription is only re-created when the channel changes.
 */
export function useTransmitSubscription<S extends z.ZodType>(
  channel: string,
  schema: S,
  onMessage: (data: z.output<S>) => void,
  onError?: (message: string) => void,
): { connected: boolean; error: string | null } {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schemaRef = useRef(schema);
  schemaRef.current = schema;
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    setError(null);
    const subscription = transmit.subscription(channel);

    subscription
      .create()
      .then(() => {
        setConnected(true);
        setError(null);
        subscription.onMessage<unknown>((raw) => {
          const direct = schemaRef.current.safeParse(raw);
          if (direct.success) {
            onMessageRef.current(direct.data);
            return;
          }

          if (raw && typeof raw === 'object' && 'data' in raw) {
            const wrapped = schemaRef.current.safeParse((raw as { data?: unknown }).data);
            if (wrapped.success) {
              onMessageRef.current(wrapped.data);
              return;
            }
          }

          console.warn(`Received message on ${channel} in unexpected format:`, raw);
        });
      })
      .catch((err: Error) => {
        const message = `Failed to connect: ${err.message || 'Unknown error'}`;
        setConnected(false);
        setError(message);
        onErrorRef.current?.(message);
      });

    return () => {
      subscription
        .delete()
        .catch((err: Error) => console.error(`Failed to unsubscribe from ${channel}:`, err));
    };
  }, [channel]);

  return { connected, error };
}
