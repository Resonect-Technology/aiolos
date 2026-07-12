import { z } from 'zod';

import { intervalMsSchema } from './wind.js';

/** Payload broadcast on `temperature/live/:stationId` */
export const temperatureLivePayloadSchema = z.object({
  temperature: z.number(),
  intervalMs: intervalMsSchema.optional(),
  timestamp: z.string(),
});
export type TemperatureLivePayload = z.infer<typeof temperatureLivePayloadSchema>;

/** Hourly rollup rows of GET /api/stations/:id/temperature/aggregated */
export const temperatureHourlySchema = z.object({
  timestamp: z.string(),
  avgTemperature: z.number(),
  minTemperature: z.number(),
  maxTemperature: z.number(),
  sampleCount: z.number(),
});
export type TemperatureHourly = z.infer<typeof temperatureHourlySchema>;

export const temperatureAggregatedResponseSchema = z.object({
  stationId: z.string(),
  date: z.string(),
  interval: z.literal('hourly'),
  data: z.array(temperatureHourlySchema),
  totalRecords: z.number(),
});
export type TemperatureAggregatedResponse = z.infer<typeof temperatureAggregatedResponseSchema>;
