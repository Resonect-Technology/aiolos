import { z } from 'zod';

/** Response of GET /api/system/config/:key */
export const systemConfigSchema = z.object({
  key: z.string(),
  value: z.string().nullable(),
  message: z.string().optional(),
});
export type SystemConfig = z.infer<typeof systemConfigSchema>;

/** Response of GET /api/system/config — key/value map */
export const systemConfigsSchema = z.record(z.string(), z.string());
export type SystemConfigs = z.infer<typeof systemConfigsSchema>;
