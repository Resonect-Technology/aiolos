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
 * Get CSS classes for timestamp display based on staleness
 */
export function getTimestampClasses(timestamp: string): string {
  const stale = isStale(timestamp, 5);
  const veryStale = isStale(timestamp, 15);

  if (veryStale) {
    return "text-red-500 dark:text-red-400";
  } else if (stale) {
    return "text-orange-500 dark:text-orange-400";
  } else {
    return "text-slate-500 dark:text-slate-400";
  }
}

/**
 * Format sleep schedule for display (e.g., "Sleep: 22:00 - 06:00")
 */
export function formatSleepSchedule(sleepStartHour: number | null, sleepEndHour: number | null): string {
  if (sleepStartHour === null || sleepEndHour === null) {
    return "No sleep schedule configured";
  }

  if (sleepStartHour === sleepEndHour) {
    return "No sleep schedule configured";
  }

  const formatHour = (hour: number) => String(hour).padStart(2, '0') + ':00';
  return `Sleep: ${formatHour(sleepStartHour)} - ${formatHour(sleepEndHour)}`;
}

/**
 * Calculate next sleep or wake time based on current time and sleep config
 */
export function calculateNextSleepWakeTime(sleepStartHour: number | null, sleepEndHour: number | null): {
  nextEventType: 'sleep' | 'wake' | null;
  nextEventTime: Date | null;
  timeUntilNext: string;
} {
  if (sleepStartHour === null || sleepEndHour === null || sleepStartHour === sleepEndHour) {
    return {
      nextEventType: null,
      nextEventTime: null,
      timeUntilNext: "No sleep schedule"
    };
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  // Determine if currently sleeping
  let isSleeping = false;
  if (sleepStartHour < sleepEndHour) {
    // Sleep period within same day (e.g., 2 AM to 6 AM)
    isSleeping = currentHour >= sleepStartHour && currentHour < sleepEndHour;
  } else {
    // Sleep period spans midnight (e.g., 22 PM to 6 AM)
    isSleeping = currentHour >= sleepStartHour || currentHour < sleepEndHour;
  }

  let nextEventTime: Date;
  let nextEventType: 'sleep' | 'wake';

  if (isSleeping) {
    // Currently sleeping, next event is wake
    nextEventType = 'wake';
    nextEventTime = new Date(now);
    nextEventTime.setHours(sleepEndHour, 0, 0, 0);
    
    // If wake time is earlier today and we're in a cross-midnight sleep period
    if (sleepStartHour > sleepEndHour && currentHour >= sleepStartHour) {
      // Wake time is tomorrow
      nextEventTime.setDate(nextEventTime.getDate() + 1);
    } else if (sleepStartHour < sleepEndHour && currentHour >= sleepEndHour) {
      // This shouldn't happen in normal flow, but handle edge case
      nextEventTime.setDate(nextEventTime.getDate() + 1);
    }
  } else {
    // Currently awake, next event is sleep
    nextEventType = 'sleep';
    nextEventTime = new Date(now);
    nextEventTime.setHours(sleepStartHour, 0, 0, 0);
    
    // If sleep time has passed today, it's tomorrow
    if (currentHour > sleepStartHour || (currentHour === sleepStartHour && currentMinutes > 0)) {
      nextEventTime.setDate(nextEventTime.getDate() + 1);
    }
  }

  const timeUntilNext = formatTimeUntil(nextEventTime);

  return {
    nextEventType,
    nextEventTime,
    timeUntilNext
  };
}

/**
 * Format time until a future date (e.g., "2h 15m", "45m", "12s")
 */
export function formatTimeUntil(futureTime: Date): string {
  const now = new Date();
  const diffMs = futureTime.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return "Now";
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
