import { z } from 'zod';

import { intervalMsSchema, windDirectionSchema, windSpeedSchema } from '@repo/schemas';

/**
 * Ingest schema for POST /stations/:station_id/wind (frozen device contract —
 * see firmware_endpoints.spec.ts). Any shape failure maps to a single
 * 400 { error: 'Invalid wind data' } in the controller.
 *
 * Only windSpeed/windDirection can reject a reading. Every optional field is
 * forgiving — .catch(undefined) folds an invalid value into "absent" — so a
 * noise-spiked gustSpeed (reed-switch chatter can push the 60 s trailing gust
 * past the 60 m/s cap) or a bad timestamp never discards a valid avg/direction
 * sample (the controller's Date.parse fallback for timestamp stays there).
 */
export const windIngestSchema = z.object({
  windSpeed: windSpeedSchema,
  windDirection: windDirectionSchema,
  gustSpeed: windSpeedSchema.optional().catch(undefined),
  minSpeed: windSpeedSchema.optional().catch(undefined),
  intervalMs: intervalMsSchema.optional().catch(undefined),
  timestamp: z.string().optional().catch(undefined),
});
export type WindIngest = z.infer<typeof windIngestSchema>;
