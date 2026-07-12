import { z } from 'zod';

/**
 * Ingest schema for POST /stations/:station_id/diagnostics (frozen device
 * contract): only the four health numbers are required and type-checked; all
 * other fields pass through untouched (the broadcast spreads the raw body).
 */
export const diagnosticsIngestSchema = z.looseObject({
  batteryVoltage: z.number(),
  solarVoltage: z.number(),
  signalQuality: z.number(),
  uptime: z.number(),
});

/**
 * Query coercion that can never reject: non-numeric input falls back to the
 * default, numeric input is truncated and clamped — the legacy clamp()
 * semantics of the diagnostics history endpoint.
 */
const clampedIntQuery = (fallback: number, min: number, max: number) =>
  z.coerce
    .number()
    .catch(fallback)
    .transform((value) => Math.min(max, Math.max(min, Math.trunc(value))));

export const diagnosticsHistoryQuerySchema = z.object({
  hours: clampedIntQuery(24, 1, 720),
  limit: clampedIntQuery(500, 1, 2000),
});
