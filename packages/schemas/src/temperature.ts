import { z } from 'zod';

/** Payload broadcast on `temperature/live/:stationId` */
export const temperatureLivePayloadSchema = z.object({
  temperature: z.number(),
  timestamp: z.string(),
});
export type TemperatureLivePayload = z.infer<typeof temperatureLivePayloadSchema>;
