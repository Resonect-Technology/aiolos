import { z } from 'zod';

// Number(x) semantics: NaN → issue, everything else (null → 0, true → 1,
// numeric strings) coerces — exactly what the legacy per-field loop did
const coercedNumber = z.coerce.number();

/**
 * Write schema for POST /stations/:station_id/config (admin). Key order
 * mirrors the legacy validFields order so the first zod issue names the same
 * field the old loop would have reported ("Invalid value for tempInterval").
 * Unknown keys are stripped (the legacy allowlist behavior).
 */
export const stationConfigWriteSchema = z.object({
  tempInterval: coercedNumber.optional(),
  windSendInterval: coercedNumber.optional(),
  windSampleInterval: coercedNumber.optional(),
  diagInterval: coercedNumber.optional(),
  timeInterval: coercedNumber.optional(),
  restartInterval: coercedNumber.optional(),
  sleepStartHour: coercedNumber.optional(),
  sleepEndHour: coercedNumber.optional(),
  otaHour: coercedNumber.optional(),
  otaMinute: coercedNumber.optional(),
  otaDuration: coercedNumber.optional(),
  remoteOta: z.coerce.boolean().optional(),
  utcOffsetMinutes: coercedNumber.optional(),
  livestreamStartHour: coercedNumber.optional(),
  lowBatteryThreshold: coercedNumber.optional(),
});
export type StationConfigWrite = z.infer<typeof stationConfigWriteSchema>;
