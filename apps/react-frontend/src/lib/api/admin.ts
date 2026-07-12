import { z } from 'zod';

/**
 * Admin API client — all requests carry the admin session cookie and every
 * response body is validated against a zod schema before use.
 */
import {
  diagnosticsHistoryRowSchema,
  stationConfigResponseSchema,
  type StationConfig,
  type StationConfigResponse,
} from '@repo/schemas';

// Re-exported so existing importers keep working
export type { DiagnosticsHistoryRow, StationConfig } from '@repo/schemas';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

/** Thrown on non-OK responses so callers can react to 401s (session expired). */
export class AdminApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const request = async <S extends z.ZodType>(
  schema: S,
  path: string,
  init?: RequestInit,
): Promise<z.output<S>> => {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...init,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        message = body.error;
      }
    } catch {
      // Keep the status text when the body is not JSON
    }
    throw new AdminApiError(response.status, message);
  }

  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) {
    throw new AdminApiError(response.status, 'Unexpected response shape');
  }
  return parsed.data;
};

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

// Endpoints whose response body is ignored
const ignoredBody = z.unknown();

export const login = async (password: string): Promise<void> => {
  await request(ignoredBody, '/api/admin/session', jsonInit('POST', { password }));
};

export const logout = async (): Promise<void> => {
  await request(ignoredBody, '/api/admin/session', { method: 'DELETE' });
};

const sessionResponseSchema = z.looseObject({ authenticated: z.boolean().optional() });

export const getSession = async (): Promise<boolean> => {
  const body = await request(sessionResponseSchema, '/api/admin/session');
  return Boolean(body.authenticated);
};

export const getStationConfig = async (stationId: string): Promise<StationConfigResponse> => {
  return request(stationConfigResponseSchema, `/api/stations/${stationId}/config`);
};

export const saveStationConfig = async (
  stationId: string,
  config: Partial<StationConfig>,
): Promise<void> => {
  await request(ignoredBody, `/api/stations/${stationId}/config`, jsonInit('POST', config));
};

export const setSystemConfig = async (key: string, value: string): Promise<void> => {
  await request(ignoredBody, `/api/system/config/${key}`, jsonInit('POST', { value }));
};

export const getDiagnosticsHistory = async (stationId: string, hours: number) => {
  return request(
    z.array(diagnosticsHistoryRowSchema),
    `/api/stations/${stationId}/diagnostics/history?hours=${hours}`,
  );
};
