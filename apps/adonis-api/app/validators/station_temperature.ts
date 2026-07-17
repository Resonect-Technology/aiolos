import { z } from 'zod';

import { intervalMsSchema } from '@repo/schemas';

/**
 * Plausible-reading gate for POST /stations/:station_id/temperature (frozen
 * device contract). Mirrors the legacy isValidTemperature exactly: exclusive
 * bounds -40 < t < 60; the -127 sensor-error sentinel is already below -40.
 *
 * Failures are NOT 400s — the endpoint answers 201 { filtered: true } and
 * drops the reading (only a missing temperature is a 400, guarded in the
 * controller).
 */
export const temperatureValueSchema = z.number().gt(-40).lt(60);

/**
 * Forgiving intervalMs pass-through (mirrors wind ingest): an invalid value
 * folds into "absent" and never rejects the reading.
 */
export const temperatureIntervalMsSchema = intervalMsSchema.optional().catch(undefined);

/**
 * Interval for GET /temperature/aggregated — only the hourly rollup exists,
 * but the parameter mirrors the wind aggregated endpoint for symmetry.
 */
export const temperatureAggregatedIntervalSchema = z.literal('hourly').default('hourly');
