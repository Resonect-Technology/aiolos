import { z } from 'zod';

import { windDirectionSchema, windIntervalMsSchema, windSpeedSchema } from '@repo/schemas';

/**
 * Ingest schema for POST /stations/:station_id/wind (frozen device contract —
 * see firmware_endpoints.spec.ts). Any shape failure maps to a single
 * 400 { error: 'Invalid wind data' } in the controller.
 *
 * timestamp is deliberately forgiving: a bad or missing timestamp must NEVER
 * reject the reading — .catch(undefined) folds non-strings into "absent" and
 * the controller falls back to the arrival time (Date.parse check stays
 * there).
 */
export const windIngestSchema = z.object({
  windSpeed: windSpeedSchema,
  windDirection: windDirectionSchema,
  gustSpeed: windSpeedSchema.optional(),
  minSpeed: windSpeedSchema.optional(),
  intervalMs: windIntervalMsSchema.optional(),
  timestamp: z.string().optional().catch(undefined),
});
export type WindIngest = z.infer<typeof windIngestSchema>;
