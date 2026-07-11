import { DateTime } from 'luxon';

import { prisma } from '#services/prisma';

/**
 * Data Cleanup Service
 *
 * Provides basic cleanup functionality for old data based on retention policies
 */
export class DataCleanupService {
  /**
   * Clean up temperature readings based on retention policy
   */
  async cleanupTemperatureReadings(): Promise<{ deleted: number; policy: string }> {
    const policy = await prisma.dataRetentionPolicy.findFirst({
      where: { dataType: 'temperature', isActive: true },
    });

    if (!policy) {
      return { deleted: 0, policy: 'No active policy found' };
    }

    const cutoffDate = DateTime.now().minus({ days: policy.retentionDays });

    const result = await prisma.temperatureReading.deleteMany({
      where: { readingTimestamp: { lt: cutoffDate.toJSDate() } },
    });

    console.log(
      `Cleaned up ${result.count} temperature readings older than ${policy.retentionDays} days`,
    );

    return {
      deleted: result.count,
      policy: `Retention: ${policy.retentionDays} days`,
    };
  }

  /**
   * Clean up 1-minute wind data based on retention policy
   * Default retention: 1 day (configurable via retention policy)
   */
  async cleanupWindData1Min(): Promise<{ deleted: number; policy: string }> {
    const policy = await prisma.dataRetentionPolicy.findFirst({
      where: { dataType: 'wind_1min', isActive: true },
    });

    // Default to 1 day retention if no policy exists
    const retentionDays = policy?.retentionDays || 1;
    const cutoffDate = DateTime.now().minus({ days: retentionDays });

    // Wind timestamps are UTC ISO strings compared lexicographically
    const result = await prisma.windData1Min.deleteMany({
      where: { timestamp: { lt: cutoffDate.toUTC().toISO()! } },
    });

    console.log(
      `Cleaned up ${result.count} 1-minute wind records older than ${retentionDays} days`,
    );

    return {
      deleted: result.count,
      policy: policy
        ? `Retention: ${retentionDays} days`
        : `Default retention: ${retentionDays} days`,
    };
  }
  /**
   * Clean up diagnostics data based on retention policy
   */
  async cleanupDiagnostics(): Promise<{ deleted: number; policy: string }> {
    const policy = await prisma.dataRetentionPolicy.findFirst({
      where: { dataType: 'diagnostics', isActive: true },
    });

    if (!policy) {
      return { deleted: 0, policy: 'No active policy found' };
    }

    const cutoffDate = DateTime.now().minus({ days: policy.retentionDays });

    const result = await prisma.stationDiagnostic.deleteMany({
      where: { createdAt: { lt: cutoffDate.toJSDate() } },
    });

    console.log(
      `Cleaned up ${result.count} diagnostics records older than ${policy.retentionDays} days`,
    );

    return {
      deleted: result.count,
      policy: `Retention: ${policy.retentionDays} days`,
    };
  }

  /**
   * Run all cleanup operations
   */
  async runAllCleanups(): Promise<{
    temperatureCleanup: any;
    diagnosticsCleanup: any;
    windData1MinCleanup: any;
  }> {
    console.log('Starting data cleanup operations...');

    const temperatureCleanup = await this.cleanupTemperatureReadings();
    const diagnosticsCleanup = await this.cleanupDiagnostics();
    const windData1MinCleanup = await this.cleanupWindData1Min();

    console.log('Data cleanup operations completed');

    return {
      temperatureCleanup,
      diagnosticsCleanup,
      windData1MinCleanup,
    };
  }
}

// Export singleton instance
export const dataCleanupService = new DataCleanupService();
