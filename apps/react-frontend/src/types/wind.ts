// Re-exported from the shared contract package (kept as a shim so existing
// imports don't churn). gustSpeed/minSpeed are the station's max/min 3 s
// rolling means; intervalMs is the effective send interval (drives the
// staleness threshold). All three are absent on payloads from older firmware.
export type { WindData } from '@repo/schemas';
