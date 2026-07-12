import { Transmit } from '@adonisjs/transmit-client';

/**
 * Shared Transmit (SSE) client — one connection multiplexes every channel
 * subscription instead of each component opening its own EventSource.
 * Never call `close()` on this instance; components only manage their own
 * `subscription(...)` lifecycles.
 *
 * maxReconnectAttempts defaults to 5, after which the client closes the
 * EventSource for good — any outage longer than ~30 s (every deploy, a phone
 * waking from background) would permanently freeze the dashboard.
 */
export const transmit = new Transmit({
  baseUrl: window.location.origin,
  maxReconnectAttempts: Number.POSITIVE_INFINITY,
});
