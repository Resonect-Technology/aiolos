import { z } from 'zod';

// Number(x) semantics: NaN → issue, everything else (null → 0, true → 1,
// numeric strings) coerces — exactly what the legacy per-field loop did
const ranged = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

/**
 * Write schema for POST /stations/:station_id/config (admin). Key order
 * mirrors the legacy validFields order so the first zod issue names the same
 * field the old loop would have reported ("Invalid value for tempInterval").
 * Unknown keys are stripped (the legacy allowlist behavior).
 *
 * Interval fields are MILLISECONDS (restartInterval alone is seconds). The
 * ranges guard against seconds-vs-ms mixups — the firmware would apply a raw
 * seconds value as a sub-second send loop — and keep windSendInterval inside
 * the wind ingest endpoint's accepted intervalMs range, so a config write can
 * never make the station's wind POSTs 400.
 */
export const stationConfigWriteSchema = z.object({
  tempInterval: ranged(10_000, 86_400_000).optional(), // 10 s – 24 h
  windSendInterval: ranged(1000, 3_600_000).optional(), // 1 s – 1 h, matches ingest intervalMs bounds
  windSampleInterval: ranged(1000, 60_000).optional(), // 1 s – 1 min
  diagInterval: ranged(60_000, 86_400_000).optional(), // 1 min – 24 h
  timeInterval: ranged(600_000, 3_600_000).optional(), // 10 min – 1 h (firmware sleep needs <2 h-fresh time)
  restartInterval: ranged(3600, 604_800).optional(), // SECONDS, 1 h – 1 week, mirrors firmware clamp
  sleepStartHour: ranged(0, 23).optional(),
  sleepEndHour: ranged(0, 23).optional(),
  otaHour: ranged(0, 23).optional(),
  otaMinute: ranged(0, 59).optional(),
  otaDuration: ranged(5, 240).optional(), // minutes
  remoteOta: z.coerce.boolean().optional(),
  utcOffsetMinutes: ranged(-720, 840).optional(), // -12:00 to +14:00
  livestreamStartHour: ranged(-1, 23).optional(), // -1 disables morning slow mode
  lowBatteryThreshold: z.coerce.number().min(0).max(5).optional(), // volts; 0 disables the gate
});
export type StationConfigWrite = z.infer<typeof stationConfigWriteSchema>;
