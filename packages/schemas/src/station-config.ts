import { z } from 'zod';

const nullableNumber = z.number().nullable();

/**
 * Response of GET /api/stations/:id/config — the shape the deployed stations
 * read. Intervals are milliseconds except restartInterval (seconds).
 * remoteOta can surface as SQLite 0/1; normalized to boolean here.
 */
export const stationConfigResponseSchema = z.looseObject({
  tempInterval: nullableNumber,
  windSendInterval: nullableNumber,
  windSampleInterval: nullableNumber,
  diagInterval: nullableNumber,
  timeInterval: nullableNumber,
  restartInterval: nullableNumber,
  sleepStartHour: nullableNumber,
  sleepEndHour: nullableNumber,
  otaHour: nullableNumber,
  otaMinute: nullableNumber,
  otaDuration: nullableNumber,
  remoteOta: z.union([z.boolean(), z.number()]).transform(Boolean),
  utcOffsetMinutes: nullableNumber,
  livestreamStartHour: nullableNumber,
  lowBatteryThreshold: nullableNumber,
  stationId: z.string().optional(),
  message: z.string().optional(),
});
export type StationConfigResponse = z.infer<typeof stationConfigResponseSchema>;

/** The writable config fields (what admin POSTs and the DB stores) */
export type StationConfig = Omit<StationConfigResponse, 'stationId' | 'message'>;
