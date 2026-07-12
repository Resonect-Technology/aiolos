import { Transmit } from '@adonisjs/transmit-client';

/**
 * Shared Transmit (SSE) client — one connection multiplexes every channel
 * subscription instead of each component opening its own EventSource.
 * Never call `close()` on this instance; components only manage their own
 * `subscription(...)` lifecycles.
 */
export const transmit = new Transmit({
  baseUrl: window.location.origin,
});
