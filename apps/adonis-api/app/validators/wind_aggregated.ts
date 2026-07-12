import { DateTime } from 'luxon';
import { z } from 'zod';

import { aggregateIntervalSchema, windUnitSchema } from '@repo/schemas';

/**
 * Query-string schemas for the aggregated wind endpoints. Consumed one at a
 * time, in the legacy check order, so each failure can return its exact
 * legacy error message from the controller.
 */

export const aggregateIntervalQuerySchema = aggregateIntervalSchema.default('1min');

export const windUnitQuerySchema = windUnitSchema.default('ms');

// Luxon fromISO acceptance preserved verbatim (it allows more than bare
// YYYY-MM-DD; the error message is aspirational)
export const dateQuerySchema = z
  .string()
  .refine((value) => DateTime.fromISO(value).isValid)
  .optional();

// parseInt semantics preserved ('10abc' → 10); NaN now fails here with the
// legacy limit message instead of reaching Prisma
export const limitQuerySchema = (defaultLimit: number, maxLimit: number) =>
  z
    .string()
    .optional()
    .transform((value) => (value ? parseInt(value) : defaultLimit))
    .refine((limit) => !Number.isNaN(limit) && limit >= 1 && limit <= maxLimit);
