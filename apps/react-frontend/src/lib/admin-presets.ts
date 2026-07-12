import type { StationConfig } from '@/lib/api/admin';

/**
 * One-click config presets, carried over from the retired Bruno collection.
 * remoteOta is intentionally omitted — triggering an OTA window is an explicit
 * action, never a side effect of applying a preset. Fields a preset doesn't
 * set keep their current form values.
 */
export interface ConfigPreset {
  name: string;
  description: string;
  values: Partial<StationConfig>;
}

export const CONFIG_PRESETS: ConfigPreset[] = [
  {
    name: 'Regular',
    description: 'Averaged wind every 2 min, temperature every 50 s. The everyday mode.',
    values: {
      tempInterval: 50000,
      windSendInterval: 120000,
      windSampleInterval: 30000,
      diagInterval: 300000,
      timeInterval: 3600000,
      restartInterval: 21600,
      sleepStartHour: 22,
      sleepEndHour: 9,
      otaHour: 10,
      otaMinute: 0,
      otaDuration: 60,
    },
  },
  {
    name: 'High frequency',
    description: 'Live wind every second, diagnostics every minute. Highest power draw.',
    values: {
      tempInterval: 60000,
      windSendInterval: 1000,
      windSampleInterval: 1000,
      diagInterval: 60000,
      timeInterval: 3600000,
      restartInterval: 21600,
      sleepStartHour: 21,
      sleepEndHour: 8,
      otaHour: 12,
      otaMinute: 0,
      otaDuration: 5,
    },
  },
  {
    name: 'Low power',
    description: 'Averaged wind every 5 min, restart every 3 days. For weak sun periods.',
    values: {
      tempInterval: 300000,
      windSendInterval: 300000,
      windSampleInterval: 10000,
      diagInterval: 300000,
      timeInterval: 3600000,
      restartInterval: 259200,
      sleepStartHour: 21,
      sleepEndHour: 9,
      otaHour: 12,
      otaMinute: 0,
      otaDuration: 60,
    },
  },
];
