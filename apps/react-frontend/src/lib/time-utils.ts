/**
 * Time utility functions for formatting timestamps and calculating time differences
 */

/**
 * Format a timestamp to show "X minutes ago" or "X seconds ago"
 */
export function formatLastUpdated(timestamp: string): string {
  const now = new Date();
  const lastUpdated = new Date(timestamp);
  const diffMs = now.getTime() - lastUpdated.getTime();

  // Ensure we never show negative values (handle clock skew or future timestamps)
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const diffMinutes = Math.max(0, Math.floor(diffSeconds / 60));
  const diffHours = Math.max(0, Math.floor(diffMinutes / 60));
  const diffDays = Math.max(0, Math.floor(diffHours / 24));

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

/**
 * Format a timestamp for display (e.g., "2024-01-15 14:30:25")
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Check if data is stale (older than specified minutes)
 */
export function isStale(timestamp: string, maxAgeMinutes: number = 5): boolean {
  const now = new Date();
  const lastUpdated = new Date(timestamp);
  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  return diffMinutes > maxAgeMinutes;
}

/**
 * Staleness threshold derived from the station's reported send interval
 * (`intervalMs` in the live wind payload): 3x the cadence, clamped to
 * [2 min, 30 min]. Falls back to 15 min when the interval is unknown, which
 * tolerates the 10-minute slow mode without false alarms.
 */
export function staleThresholdMs(intervalMs: number | null | undefined): number {
  if (!intervalMs || !Number.isFinite(intervalMs)) {
    return 15 * 60 * 1000;
  }
  return Math.min(Math.max(3 * intervalMs, 2 * 60 * 1000), 30 * 60 * 1000);
}

/**
 * Get CSS classes for timestamp display based on staleness
 */
export function getTimestampClasses(timestamp: string): string {
  const stale = isStale(timestamp, 5);
  const veryStale = isStale(timestamp, 15);

  if (veryStale) {
    return 'text-red-500 dark:text-red-400';
  } else if (stale) {
    return 'text-orange-500 dark:text-orange-400';
  } else {
    return 'text-slate-500 dark:text-slate-400';
  }
}

/**
 * Format sleep schedule for display (e.g., "Sleep: 22:00 - 06:00")
 */
export function formatSleepSchedule(
  sleepStartHour: number | null,
  sleepEndHour: number | null,
): string {
  if (sleepStartHour === null || sleepEndHour === null) {
    return 'No sleep schedule configured';
  }

  if (sleepStartHour === sleepEndHour) {
    return 'No sleep schedule configured';
  }

  const formatHour = (hour: number) => String(hour).padStart(2, '0') + ':00';
  return `Sleep: ${formatHour(sleepStartHour)} - ${formatHour(sleepEndHour)}`;
}

/**
 * Current minutes-of-day on the STATION's clock — from the config's
 * utcOffsetMinutes, falling back to Europe/Athens (single-station product).
 * The sleep schedule is defined in station-local hours, so using the
 * browser's clock shows wrong Live/Sleeping state to visitors abroad.
 */
export function getStationMinutesOfDay(utcOffsetMinutes: number | null): number {
  const now = new Date();
  if (utcOffsetMinutes !== null && Number.isFinite(utcOffsetMinutes)) {
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    return (((utcMinutes + utcOffsetMinutes) % 1440) + 1440) % 1440;
  }
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Athens',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

/**
 * Current hour on the station's clock (see getStationMinutesOfDay)
 */
export function getStationHour(utcOffsetMinutes: number | null): number {
  return Math.floor(getStationMinutesOfDay(utcOffsetMinutes) / 60);
}

/**
 * Whether the station-local hour falls inside the sleep window
 */
export function isInSleepWindow(
  currentHour: number,
  sleepStartHour: number,
  sleepEndHour: number,
): boolean {
  if (sleepStartHour === sleepEndHour) {
    return false; // No sleep period configured
  }
  if (sleepStartHour < sleepEndHour) {
    // Sleep period within same day (e.g., 2 AM to 6 AM)
    return currentHour >= sleepStartHour && currentHour < sleepEndHour;
  }
  // Sleep period spans midnight (e.g., 22 PM to 6 AM)
  return currentHour >= sleepStartHour || currentHour < sleepEndHour;
}

/**
 * Calculate next sleep or wake time based on the station's clock
 */
export function calculateNextSleepWakeTime(
  sleepStartHour: number | null,
  sleepEndHour: number | null,
  utcOffsetMinutes: number | null = null,
): {
  nextEventType: 'sleep' | 'wake' | null;
  nextEventTime: Date | null;
  timeUntilNext: string;
} {
  if (sleepStartHour === null || sleepEndHour === null || sleepStartHour === sleepEndHour) {
    return {
      nextEventType: null,
      nextEventTime: null,
      timeUntilNext: 'No sleep schedule',
    };
  }

  const nowMinutes = getStationMinutesOfDay(utcOffsetMinutes);
  const currentHour = Math.floor(nowMinutes / 60);
  const isSleeping = isInSleepWindow(currentHour, sleepStartHour, sleepEndHour);

  const nextEventType: 'sleep' | 'wake' = isSleeping ? 'wake' : 'sleep';
  const targetMinutes = (isSleeping ? sleepEndHour : sleepStartHour) * 60;

  // Wall-clock duration until the next event is timezone-independent
  let minutesUntil = targetMinutes - nowMinutes;
  if (minutesUntil <= 0) {
    minutesUntil += 1440;
  }
  const nextEventTime = new Date(Date.now() + minutesUntil * 60 * 1000);

  return {
    nextEventType,
    nextEventTime,
    timeUntilNext: formatTimeUntil(nextEventTime),
  };
}

/**
 * Format time until a future date (e.g., "2h 15m", "45m", "12s")
 */
export function formatTimeUntil(futureTime: Date): string {
  const now = new Date();
  const diffMs = futureTime.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Now';
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return remainingHours > 0 ? `${diffDays}d ${remainingHours}h` : `${diffDays}d`;
  } else if (diffHours > 0) {
    const remainingMinutes = diffMinutes % 60;
    return remainingMinutes > 0 ? `${diffHours}h ${remainingMinutes}m` : `${diffHours}h`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m`;
  } else {
    return `${diffSeconds}s`;
  }
}
