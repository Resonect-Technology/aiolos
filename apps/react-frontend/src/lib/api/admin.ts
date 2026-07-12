/**
 * Admin API client — all requests carry the admin session cookie.
 */
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

/**
 * Station config as served by GET /api/stations/:station_id/config.
 * Intervals are milliseconds except restartInterval (seconds).
 */
export interface StationConfig {
  tempInterval: number | null;
  windSendInterval: number | null;
  windSampleInterval: number | null;
  diagInterval: number | null;
  timeInterval: number | null;
  restartInterval: number | null;
  sleepStartHour: number | null;
  sleepEndHour: number | null;
  otaHour: number | null;
  otaMinute: number | null;
  otaDuration: number | null;
  remoteOta: boolean;
  utcOffsetMinutes: number | null;
  livestreamStartHour: number | null;
  lowBatteryThreshold: number | null;
}

export interface DiagnosticsHistoryRow {
  id: number;
  stationId: string;
  batteryVoltage: number;
  solarVoltage: number;
  internalTemperature: number | null;
  signalQuality: number;
  uptime: number;
  firmwareVersion: string | null;
  freeHeap: number | null;
  minFreeHeap: number | null;
  resetReason: string | null;
  createdAt: string;
}

/** Thrown on non-OK responses so callers can react to 401s (session expired). */
export class AdminApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const request = async <T = unknown>(path: string, init?: RequestInit): Promise<T> => {
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

  return response.json() as Promise<T>;
};

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export const login = async (password: string): Promise<void> => {
  await request('/api/admin/session', jsonInit('POST', { password }));
};

export const logout = async (): Promise<void> => {
  await request('/api/admin/session', { method: 'DELETE' });
};

export const getSession = async (): Promise<boolean> => {
  const body = await request<{ authenticated?: boolean }>('/api/admin/session');
  return Boolean(body.authenticated);
};

export const getStationConfig = async (stationId: string): Promise<StationConfig> => {
  return request<StationConfig>(`/api/stations/${stationId}/config`);
};

export const saveStationConfig = async (
  stationId: string,
  config: Partial<StationConfig>,
): Promise<void> => {
  await request(`/api/stations/${stationId}/config`, jsonInit('POST', config));
};

export const setSystemConfig = async (key: string, value: string): Promise<void> => {
  await request(`/api/system/config/${key}`, jsonInit('POST', { value }));
};

export const getDiagnosticsHistory = async (
  stationId: string,
  hours: number,
): Promise<DiagnosticsHistoryRow[]> => {
  return request<DiagnosticsHistoryRow[]>(
    `/api/stations/${stationId}/diagnostics/history?hours=${hours}`,
  );
};
