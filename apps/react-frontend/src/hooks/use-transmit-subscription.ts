import { useEffect, useRef, useState } from 'react';

import { transmit } from '../lib/transmit';

/**
 * Subscribe to a Transmit (SSE) channel for the lifetime of the component.
 *
 * The latest callbacks are kept in refs so callers don't need useCallback and
 * the subscription is only re-created when the channel changes. Payload
 * validation stays with the caller — pass the raw message type as T and
 * narrow inside onMessage.
 */
export function useTransmitSubscription<T>(
  channel: string,
  onMessage: (data: T) => void,
  onError?: (message: string) => void,
): { connected: boolean; error: string | null } {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        subscription.onMessage<T>((data) => onMessageRef.current(data));
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
