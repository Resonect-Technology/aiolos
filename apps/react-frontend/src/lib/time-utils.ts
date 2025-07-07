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
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

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
