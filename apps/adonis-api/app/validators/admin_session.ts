import { z } from 'zod';

/** Login body for POST /admin/session; failure maps to 401 Invalid password */
export const adminLoginSchema = z.object({ password: z.string() });
