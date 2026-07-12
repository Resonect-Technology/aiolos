import { z } from 'zod';

/**
 * Payload broadcast on `station/diagnostics/:stationId`. The backend spreads
 * the raw request body plus a timestamp, so unknown keys pass through — hence
 * a loose object: only the four required health numbers are guaranteed.
 */
export const diagnosticsLivePayloadSchema = z.looseObject({
  batteryVoltage: z.number(),
  solarVoltage: z.number(),
  signalQuality: z.number(),
  uptime: z.number(),
  internalTemperature: z.number().nullable().optional(),
  firmwareVersion: z.string().nullable().optional(),
  freeHeap: z.number().nullable().optional(),
  minFreeHeap: z.number().nullable().optional(),
  resetReason: z.string().nullable().optional(),
  timestamp: z.string(),
});
export type DiagnosticsLivePayload = z.infer<typeof diagnosticsLivePayloadSchema>;

/** Row shape of GET /api/stations/:id/diagnostics/history (and the single-row GET) */
export const diagnosticsHistoryRowSchema = z.object({
  id: z.number(),
  stationId: z.string(),
  batteryVoltage: z.number(),
  solarVoltage: z.number(),
  internalTemperature: z.number().nullable(),
  signalQuality: z.number(),
  uptime: z.number(),
  firmwareVersion: z.string().nullable(),
  freeHeap: z.number().nullable(),
  minFreeHeap: z.number().nullable(),
  resetReason: z.string().nullable(),
  createdAt: z.string(),
});
export type DiagnosticsHistoryRow = z.infer<typeof diagnosticsHistoryRowSchema>;

/** Daily rollup rows of GET /api/stations/:id/diagnostics/aggregated */
export const diagnosticsDailyRowSchema = z.object({
  stationId: z.string(),
  date: z.string(),
  batteryMin: z.number(),
  batteryAvg: z.number(),
  batteryMax: z.number(),
  solarMin: z.number(),
  solarAvg: z.number(),
  solarMax: z.number(),
  signalQualityAvg: z.number(),
  internalTempMin: z.number().nullable(),
  internalTempAvg: z.number().nullable(),
  internalTempMax: z.number().nullable(),
  sampleCount: z.number(),
});
export type DiagnosticsDailyRow = z.infer<typeof diagnosticsDailyRowSchema>;
