import { z } from 'zod';

import { intervalMsSchema } from './wind.js';

/** Payload broadcast on `temperature/live/:stationId` */
export const temperatureLivePayloadSchema = z.object({
  temperature: z.number(),
  intervalMs: intervalMsSchema.optional(),
  timestamp: z.string(),
});
export type TemperatureLivePayload = z.infer<typeof temperatureLivePayloadSchema>;
