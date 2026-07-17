import { z } from 'zod';

export const windUnitSchema = z.enum(['ms', 'kmh', 'knots']);
export type WindUnit = z.infer<typeof windUnitSchema>;

export const aggregateIntervalSchema = z.enum(['1min', '10min', 'hourly']);
export type AggregateInterval = z.infer<typeof aggregateIntervalSchema>;

export const tendencySchema = z.enum(['increasing', 'decreasing', 'stable']);
export type Tendency = z.infer<typeof tendencySchema>;

const aggregateBase = z.object({
  timestamp: z.string(),
  avgSpeed: z.number(),
  minSpeed: z.number(),
  maxSpeed: z.number(),
  gustSpeed: z.number().nullable(),
  dominantDirection: z.number(),
});

export const windAggregated1MinSchema = aggregateBase.extend({
  sampleCount: z.number(),
});
export type WindAggregated1Min = z.infer<typeof windAggregated1MinSchema>;

export const windAggregated10MinSchema = aggregateBase.extend({
  tendency: tendencySchema,
});
export type WindAggregated10Min = z.infer<typeof windAggregated10MinSchema>;

// Hourly rollup rows (aggregated from the 10-minute data, kept indefinitely)
export const windAggregatedHourlySchema = aggregateBase.extend({
  intervalCount: z.number(),
});
export type WindAggregatedHourly = z.infer<typeof windAggregatedHourlySchema>;

// SSE broadcasts on `wind/aggregated/{interval}/:stationId` carry the row plus stationId
export const windAggregated1MinBroadcastSchema = windAggregated1MinSchema.extend({
  stationId: z.string(),
});
export type WindAggregated1MinBroadcast = z.infer<typeof windAggregated1MinBroadcastSchema>;

export const windAggregated10MinBroadcastSchema = windAggregated10MinSchema.extend({
  stationId: z.string(),
});
export type WindAggregated10MinBroadcast = z.infer<typeof windAggregated10MinBroadcastSchema>;

// GET /api/stations/:id/wind/aggregated response envelope
const responseEnvelope = z.object({
  stationId: z.string(),
  date: z.string(),
  interval: aggregateIntervalSchema,
  unit: windUnitSchema.optional(),
  totalRecords: z.number(),
});

export const windAggregated1MinResponseSchema = responseEnvelope.extend({
  data: z.array(windAggregated1MinSchema),
});
export type WindAggregated1MinResponse = z.infer<typeof windAggregated1MinResponseSchema>;

export const windAggregated10MinResponseSchema = responseEnvelope.extend({
  data: z.array(windAggregated10MinSchema),
});
export type WindAggregated10MinResponse = z.infer<typeof windAggregated10MinResponseSchema>;

export const windAggregatedHourlyResponseSchema = responseEnvelope.extend({
  data: z.array(windAggregatedHourlySchema),
});
export type WindAggregatedHourlyResponse = z.infer<typeof windAggregatedHourlyResponseSchema>;
