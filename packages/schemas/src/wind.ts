import { z } from 'zod';

// Ingest bounds are part of the frozen device contract: the station can send
// speeds 0–60 m/s and directions 0–360 (360 inclusive). Broadcast values have
// always satisfied these bounds, so the same atoms serve both sides.
export const windSpeedSchema = z.number().min(0).max(60);
export const windDirectionSchema = z.number().min(0).max(360);
/** Station send-interval bounds — shared by the wind and temperature payloads */
export const intervalMsSchema = z.number().min(500).max(3_600_000);

/** Payload broadcast on `wind/live/:stationId` (optional keys omitted, never null) */
export const windLivePayloadSchema = z.object({
  windSpeed: windSpeedSchema,
  windDirection: windDirectionSchema,
  gustSpeed: windSpeedSchema.optional(),
  minSpeed: windSpeedSchema.optional(),
  intervalMs: intervalMsSchema.optional(),
  timestamp: z.string(),
});
export type WindLivePayload = z.infer<typeof windLivePayloadSchema>;

/** Frontend-familiar alias for the live wind reading */
export type WindData = WindLivePayload;
