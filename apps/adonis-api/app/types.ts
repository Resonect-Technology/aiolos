/**
 * Wind tendency compared to the previous 10-minute interval.
 * Mirrors the CHECK constraint on wind_data_10min.tendency in the legacy DDL;
 * enforced at application level since Prisma cannot express CHECK constraints.
 */
export type WindTendency = 'increasing' | 'decreasing' | 'stable';
