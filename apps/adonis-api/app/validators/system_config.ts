import { z } from 'zod';

/**
 * Write schema for POST /system/config/:key (admin). Any present value is
 * accepted and stringified by the controller; only a missing value is an
 * error (legacy 400 'Value is required').
 */
export const systemConfigWriteSchema = z
  .object({ value: z.unknown() })
  .refine((body) => body.value !== undefined);
